CREATE OR REPLACE FUNCTION public.rpc_get_today_status(p_device_id text)
RETURNS TABLE(
  free_remaining integer,
  reward_charge_remaining integer,
  reward_use_remaining integer,
  total_remaining integer,
  used_count integer,
  free_limit integer,
  rewarded_count integer,
  rewarded_used_count integer,
  rewarded_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;