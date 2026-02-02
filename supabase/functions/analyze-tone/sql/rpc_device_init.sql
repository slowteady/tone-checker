CREATE OR REPLACE FUNCTION public.rpc_device_init(p_device_id text, p_platform text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, device_id text, platform text, last_seen_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
