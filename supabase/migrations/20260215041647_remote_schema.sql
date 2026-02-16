


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rpc_device_init"("p_device_id" "text", "p_platform" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "device_id" "text", "platform" "text", "last_seen_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- device_id 기준 upsert
  return query
  insert into public.devices (device_id, platform, last_seen_at)
  values (p_device_id, p_platform, now())
  on conflict on constraint devices_device_id_key
  do update set
    platform    = coalesce(excluded.platform, public.devices.platform),
    last_seen_at = now()
  returning
    public.devices.id,
    public.devices.device_id,
    public.devices.platform,
    public.devices.last_seen_at,
    public.devices.created_at;
end;
$$;


ALTER FUNCTION "public"."rpc_device_init"("p_device_id" "text", "p_platform" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_today_status"("p_device_id" "text") RETURNS TABLE("free_remaining" integer, "reward_charge_remaining" integer, "reward_use_remaining" integer, "total_remaining" integer, "used_count" integer, "free_limit" integer, "rewarded_count" integer, "rewarded_used_count" integer, "rewarded_limit" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_row public.daily_usage%rowtype;
BEGIN
  -- 1) 오늘 row가 없으면 생성 (중복 방지는 (device_id, date) unique index가 전제)
  INSERT INTO public.daily_usage (device_id, date)
  VALUES (p_device_id, v_today)
  ON CONFLICT (device_id, date) DO NOTHING;

  -- 2) 오늘 row 조회
  SELECT *
    INTO v_row
    FROM public.daily_usage
   WHERE device_id = p_device_id
     AND date = v_today;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to get daily usage record for device % on %', p_device_id, v_today;
  END IF;

  -- 3) 계산해서 리턴
  RETURN QUERY
  SELECT
    greatest(v_row.free_limit - v_row.used_count, 0)                                       AS free_remaining,
    greatest(v_row.rewarded_limit - v_row.rewarded_count, 0)                               AS reward_charge_remaining,
    greatest(v_row.rewarded_count - v_row.rewarded_used_count, 0)                          AS reward_use_remaining,
    greatest(v_row.free_limit - v_row.used_count, 0)
      + greatest(v_row.rewarded_count - v_row.rewarded_used_count, 0)                      AS total_remaining,
    v_row.used_count                                                                       AS used_count,
    v_row.free_limit                                                                       AS free_limit,
    v_row.rewarded_count                                                                   AS rewarded_count,
    v_row.rewarded_used_count                                                              AS rewarded_used_count,
    v_row.rewarded_limit                                                                   AS rewarded_limit;
END;
$$;


ALTER FUNCTION "public"."rpc_get_today_status"("p_device_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reward_once"("p_device_id" "text") RETURNS TABLE("rewarded" boolean, "reward_charge_remaining" integer, "target_date" "date", "rewarded_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_row public.daily_usage%rowtype;
  v_new_count int;
BEGIN
  INSERT INTO public.daily_usage (device_id, date)
  VALUES (p_device_id, v_today)
  ON CONFLICT (device_id, date) DO NOTHING;

  SELECT *
    INTO v_row
    FROM public.daily_usage
   WHERE device_id = p_device_id
     AND date = v_today
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Daily usage record not found for device %', p_device_id;
  END IF;

  IF v_row.rewarded_count < v_row.rewarded_limit THEN
    UPDATE public.daily_usage du
       SET rewarded_count = du.rewarded_count + 1
     WHERE du.id = v_row.id
     RETURNING du.rewarded_count INTO v_new_count;

    RETURN QUERY
    SELECT
      true,
      greatest(v_row.rewarded_limit - v_new_count, 0),
      v_today,
      v_new_count;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    false,
    0,
    v_today,
    v_row.rewarded_count;
END;
$$;


ALTER FUNCTION "public"."rpc_reward_once"("p_device_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_analysis_once"("p_device_id" "text") RETURNS TABLE("allowed" boolean, "used_from" "text", "remaining_free" integer, "remaining_rewarded" integer, "remaining_total" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_row public.daily_usage%rowtype;
begin
  -- 1) 오늘 row 잠금 확보 (있으면)
  select *
    into v_row
    from public.daily_usage
   where device_id = p_device_id
     and date = v_today
   for update;

  -- 2) 없으면 생성 후 다시 잠금 확보
  if not found then
    insert into public.daily_usage (device_id, date)
    values (p_device_id, v_today)
    on conflict (device_id, date) do nothing;

    select *
      into v_row
      from public.daily_usage
     where device_id = p_device_id
       and date = v_today
     for update;
  end if;

  -- 3) 무료 사용 가능
  if v_row.used_count < v_row.free_limit then
    update public.daily_usage
       set used_count = used_count + 1
     where id = v_row.id;

    return query
    select
      true,
      'free_used',
      (v_row.free_limit - v_row.used_count - 1),
      greatest(v_row.rewarded_count - v_row.rewarded_used_count, 0),
      (v_row.free_limit - v_row.used_count - 1) + greatest(v_row.rewarded_count - v_row.rewarded_used_count, 0);
    return;
  end if;

  -- 4) 광고분 사용 가능 (충전된 횟수 > 사용된 횟수)
  if v_row.rewarded_used_count < v_row.rewarded_count then
    update public.daily_usage
       set rewarded_used_count = rewarded_used_count + 1
     where id = v_row.id;

    return query
    select
      true,
      'rewarded_used',
      0,
      (v_row.rewarded_count - v_row.rewarded_used_count - 1),
      (v_row.rewarded_count - v_row.rewarded_used_count - 1);
    return;
  end if;

  -- 5) 사용 불가
  return query
  select
    false,
    'limit_exceeded',
    0,
    0,
    0;
end;
$$;


ALTER FUNCTION "public"."use_analysis_once"("p_device_id" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."daily_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text" NOT NULL,
    "date" "date" NOT NULL,
    "free_limit" integer DEFAULT 3 NOT NULL,
    "used_count" integer DEFAULT 0 NOT NULL,
    "rewarded_limit" integer DEFAULT 5 NOT NULL,
    "rewarded_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rewarded_used_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."daily_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_usage" IS '디바이스별 일자 기준 무료/보상 사용량 집계 테이블';



COMMENT ON COLUMN "public"."daily_usage"."id" IS '행 고유 식별자(UUID)';



COMMENT ON COLUMN "public"."daily_usage"."device_id" IS '익명 디바이스 식별자(집계 기준 키)';



COMMENT ON COLUMN "public"."daily_usage"."date" IS '사용량 집계 기준 날짜(로컬/서버 current_date 기준)';



COMMENT ON COLUMN "public"."daily_usage"."free_limit" IS '하루 무료 제공량(기본 3회)';



COMMENT ON COLUMN "public"."daily_usage"."used_count" IS '오늘 총 분석 사용 횟수(무료+보상 포함, 소모 카운트)';



COMMENT ON COLUMN "public"."daily_usage"."rewarded_limit" IS '하루 보상 광고로 충전 가능한 최대 횟수(기본 3회)';



COMMENT ON COLUMN "public"."daily_usage"."rewarded_count" IS '오늘 보상 광고 시청으로 충전된 횟수(충전 누적)';



COMMENT ON COLUMN "public"."daily_usage"."created_at" IS '행 생성 시각';



COMMENT ON COLUMN "public"."daily_usage"."rewarded_used_count" IS '오늘 보상으로 충전된 횟수 중 실제로 사용한 횟수(보상 소모 카운트)';



CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "device_id" "text" NOT NULL,
    "platform" "text",
    "last_seen_at" timestamp with time zone
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


COMMENT ON TABLE "public"."devices" IS '익명 사용자를 구분하기 위한 디바이스 테이블';



COMMENT ON COLUMN "public"."devices"."id" IS '행 고유 식별자(UUID)';



COMMENT ON COLUMN "public"."devices"."created_at" IS '최초 생성 시각';



COMMENT ON COLUMN "public"."devices"."device_id" IS '앱에서 생성한 익명 디바이스 식별자(클라이언트 저장)';



COMMENT ON COLUMN "public"."devices"."platform" IS '플랫폼 정보';



COMMENT ON COLUMN "public"."devices"."last_seen_at" IS '마지막 요청/접속 시각(활동 갱신용)';



ALTER TABLE ONLY "public"."daily_usage"
    ADD CONSTRAINT "daily_usage_device_id_date_key" UNIQUE ("device_id", "date");



ALTER TABLE ONLY "public"."daily_usage"
    ADD CONSTRAINT "daily_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_device_id_key" UNIQUE ("device_id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "daily_usage_device_date_uniq" ON "public"."daily_usage" USING "btree" ("device_id", "date");



CREATE UNIQUE INDEX "devices_device_id_uq" ON "public"."devices" USING "btree" ("device_id");



CREATE INDEX "devices_last_seen_at_idx" ON "public"."devices" USING "btree" ("last_seen_at" DESC);



ALTER TABLE "public"."daily_usage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deny_all_direct_access" ON "public"."daily_usage" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_direct_access" ON "public"."devices" USING (false) WITH CHECK (false);



ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."rpc_device_init"("p_device_id" "text", "p_platform" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_device_init"("p_device_id" "text", "p_platform" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_device_init"("p_device_id" "text", "p_platform" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_today_status"("p_device_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_today_status"("p_device_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_today_status"("p_device_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reward_once"("p_device_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reward_once"("p_device_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reward_once"("p_device_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."use_analysis_once"("p_device_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."use_analysis_once"("p_device_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_analysis_once"("p_device_id" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."daily_usage" TO "anon";
GRANT ALL ON TABLE "public"."daily_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_usage" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


