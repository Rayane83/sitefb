-- Fix linter: set stable search_path on trigger function
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;