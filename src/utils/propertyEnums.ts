export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  Validacion: 'Validación',
  Nuevo: 'En Venta',
  Negociacion: 'Negociación',
  Vendido: 'Vendido',
};

// Claves = valores del enum Prisma que acepta la API; valores = texto visible.
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Casa: 'Casa',
  Terreno: 'Terreno',
  Casa_y_terreno: 'Casa y terreno',
  Departamento: 'Departamento',
  Finca: 'Finca',
  Lote: 'Lote',
};

export const ZONE_LABELS: Record<string, string> = {
  Urbano: 'Urbano',
  Rural: 'Rural',
  Urbanizacion: 'Urbanización',
};

export const PROPERTY_STATUS_COLORS: Record<string, string> = {
  Validacion: 'bg-blue-100 text-blue-700',
  Nuevo: 'bg-green-100 text-green-700',
  Negociacion: 'bg-yellow-100 text-yellow-700',
  Vendido: 'bg-gray-100 text-gray-700',
};
