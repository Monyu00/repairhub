REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (display_name, department, phone, updated_at) ON public.profiles TO authenticated;
