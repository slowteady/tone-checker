CREATE OR REPLACE FUNCTION public.rpc_get_today_status(p_device_id text)
 RETURNS TABLE(free_remaining integer, reward_charge_remaining integer, reward_use_remaining integer, total_remaining integer, used_count integer, free_limit integer, rewarded_count integer, rewarded_used_count integer, rewarded_limit integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_row public.daily_usage%rowtype;
BEGIN
  INSERT INTO public.daily_usage (device_id, date)
  VALUES (p_device_id, v_today)
  ON CONFLICT (device_id, date) 
  DO UPDATE SET date = EXCLUDED.date
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Failed to get daily usage record for device %', p_device_id;
  END IF;

  RETURN QUERY SELECT
    greatest(v_row.free_limit - v_row.used_count, 0),
    greatest(v_row.rewarded_limit - v_row.rewarded_count, 0),
    greatest(v_row.rewarded_count - v_row.rewarded_used_count, 0),
    greatest(v_row.free_limit - v_row.used_count, 0) + 
      greatest(v_row.rewarded_count - v_row.rewarded_used_count, 0),
    v_row.used_count,
    v_row.free_limit,
    v_row.rewarded_count,
    v_row.rewarded_used_count,
    v_row.rewarded_limit;
END;
$function$
