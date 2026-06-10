INSERT INTO public.users (
  id, name, email, role, status, level,
  permissions, plan, "accessType",
  "accessExpires", "boughtModules",
  "createdAt", "approvedAt", "approvedBy",
  downloads
) VALUES (
  '70b71d1e-3d3e-4e13-8202-35df449cb462',
  'Admin ADAS',
  'admin@adaspro.com.br',
  'superadmin',
  'active',
  'gestor',
  '{}',
  'premium',
  'subscription',
  null,
  '{}',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '70b71d1e-3d3e-4e13-8202-35df449cb462',
  '{}'
);
