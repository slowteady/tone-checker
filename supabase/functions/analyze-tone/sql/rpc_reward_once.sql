CREATE OR REPLACE FUNCTION public.rpc_reward_once(p_device_id text)
 RETURNS TABLE(rewarded boolean, reward_charge_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_today date := current_date;
  v_row public.daily_usage%rowtype;
BEGIN
  -- 1. row 생성/확보 (동시성 안전)
  INSERT INTO public.daily_usage (device_id, date)
  VALUES (p_device_id, v_today)
  ON CONFLICT (device_id, date) DO NOTHING;

  -- 2. 행 잠금 및 조회 (동시 충전 방지)
  SELECT *
    INTO v_row
    FROM public.daily_usage
   WHERE device_id = p_device_id
     AND date = v_today
     FOR UPDATE;

  -- 3. NULL 체크 (방어적 프로그래밍)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Daily usage record not found for device %', p_device_id;
  END IF;

  -- 4. 충전 가능 여부 확인
  IF v_row.rewarded_count < v_row.rewarded_limit THEN
    -- 충전 실행
    UPDATE public.daily_usage
       SET rewarded_count = rewarded_count + 1,
           updated_at = now()  -- 업데이트 시간 갱신 (테이블에 있다면)
     WHERE id = v_row.id;

    -- 성공 응답
    RETURN QUERY
    SELECT 
      true AS rewarded,
      (v_row.rewarded_limit - v_row.rewarded_count - 1) AS reward_charge_remaining;
    RETURN;
  END IF;

  -- 5. 더 이상 충전 불가
  RETURN QUERY
  SELECT 
    false AS rewarded,
    0 AS reward_charge_remaining;
END;
$function$
