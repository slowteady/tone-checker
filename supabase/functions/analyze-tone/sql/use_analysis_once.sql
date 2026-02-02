CREATE OR REPLACE FUNCTION public.use_analysis_once(p_device_id text)
 RETURNS TABLE(allowed boolean, used_from text, remaining_free integer, remaining_rewarded integer, remaining_total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_today date := current_date;
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
$function$
