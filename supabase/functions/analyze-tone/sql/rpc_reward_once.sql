CREATE OR REPLACE FUNCTION public.rpc_reward_once(p_device_id text)
RETURNS TABLE(
  rewarded boolean,
  reward_charge_remaining integer,
  target_date date,
  rewarded_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;