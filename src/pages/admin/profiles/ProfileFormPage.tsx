import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import api from '../../../services/api';
import { alertError, toastSuccess } from '../../../utils/alerts';
import { useAuth } from '../../../context/AuthContext';
import {
  ACTION_LABELS,
  PERMISSION_ACTIONS,
  type PermissionAction,
  type ProfilePermissions,
} from '../../../types/permissions';

export const ProfileFormPage = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { can, refreshSession, modules } = useAuth();
  const canEdit = isEditMode ? can('profiles', 'edit') : can('profiles', 'create');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSystem, setIsSystem] = useState(false);
  const [permissions, setPermissions] = useState<ProfilePermissions>({});
  const [saving, setSaving] = useState(false);

  const readOnly = isSystem || !canEdit;

  useEffect(() => {
    if (!isEditMode) return;
    api
      .get(`/profiles/${id}`)
      .then(({ data }) => {
        setName(data.name);
        setDescription(data.description ?? '');
        setIsActive(data.isActive);
        setIsSystem(data.isSystem);
        setPermissions(data.permissions ?? {});
      })
      .catch((error) => {
        console.error('Error fetching profile:', error);
        alertError('Error', 'No se pudo cargar el perfil.');
        navigate('/admin/perfiles');
      });
  }, [id, isEditMode, navigate]);

  const isChecked = (moduleKey: string, action: PermissionAction) =>
    isSystem ? true : !!permissions[moduleKey]?.[action];

  const toggle = (moduleKey: string, action: PermissionAction, value: boolean) => {
    if (readOnly) return;
    setPermissions((prev) => {
      const current = { ...(prev[moduleKey] ?? {}) };
      current[action] = value;
      // Sin acceso no hay ninguna otra acción.
      if (action === 'access' && !value) {
        for (const a of PERMISSION_ACTIONS) current[a] = false;
      }
      // Cualquier acción exige acceso al módulo.
      if (action !== 'access' && value) current.access = true;
      return { ...prev, [moduleKey]: current };
    });
  };

  const toggleRow = (moduleKey: string, actions: PermissionAction[], value: boolean) => {
    if (readOnly) return;
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: Object.fromEntries(actions.map((a) => [a, value])),
    }));
  };

  const toggleColumn = (action: PermissionAction, value: boolean) => {
    if (readOnly) return;
    setPermissions((prev) => {
      const next = { ...prev };
      for (const mod of modules) {
        if (!mod.actions.includes(action)) continue;
        const current = { ...(next[mod.key] ?? {}) };
        current[action] = value;
        if (action === 'access' && !value) for (const a of PERMISSION_ACTIONS) current[a] = false;
        if (action !== 'access' && value) current.access = true;
        next[mod.key] = current;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!name.trim()) {
      alertError('Nombre requerido', 'Escribe un nombre para el perfil.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        permissions,
      };
      if (isEditMode) {
        await api.patch(`/profiles/${id}`, { ...payload, isActive });
        // Si el perfil editado es el mío, refresca permisos de inmediato.
        await refreshSession().catch(() => undefined);
      } else {
        await api.post('/profiles', payload);
      }
      toastSuccess('Perfil guardado correctamente');
      navigate('/admin/perfiles');
    } catch (error: any) {
      const msg = error.response?.data?.message;
      alertError('Error al guardar', Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/perfiles')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditMode ? (readOnly ? 'Ver Perfil' : 'Editar Perfil') : 'Nuevo Perfil'}
        </h1>
      </div>

      {isSystem && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-3 text-sm max-w-5xl">
          <Lock size={16} /> Perfil de sistema: tiene acceso total y no se puede modificar ni eliminar.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
              className="w-full p-2 border rounded-md border-gray-300 disabled:bg-gray-100 disabled:text-gray-700 disabled:opacity-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              className="w-full p-2 border rounded-md border-gray-300 disabled:bg-gray-100 disabled:text-gray-700 disabled:opacity-100"
            />
          </div>
          {isEditMode && !isSystem && (
            <div className="flex items-center gap-3">
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-1">Permisos por módulo</h3>
        <p className="text-sm text-gray-500 mb-4">
          &quot;Acceso&quot; muestra el módulo en el menú y permite ver el listado. Las demás acciones requieren acceso.
        </p>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 font-semibold text-gray-600">Módulo</th>
                {PERMISSION_ACTIONS.map((action) => {
                  const applicable = modules.filter((m) => m.actions.includes(action));
                  const allOn = applicable.every((m) => isChecked(m.key, action));
                  return (
                    <th key={action} className="p-3 font-semibold text-gray-600 text-center">
                      <label className="flex flex-col items-center gap-1 cursor-pointer">
                        {ACTION_LABELS[action]}
                        <input
                          type="checkbox"
                          checked={allOn}
                          disabled={readOnly}
                          onChange={(e) => toggleColumn(action, e.target.checked)}
                          aria-label={`Marcar todos: ${ACTION_LABELS[action]}`}
                        />
                      </label>
                    </th>
                  );
                })}
                <th className="p-3 font-semibold text-gray-600 text-center">Todo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {modules.map((mod) => {
                const rowAll = mod.actions.every((a) => isChecked(mod.key, a));
                return (
                  <tr key={mod.key} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">
                      {mod.label}
                      {!mod.inMenu && <span className="ml-2 text-xs text-gray-400">(fuera del menú)</span>}
                    </td>
                    {PERMISSION_ACTIONS.map((action) => (
                      <td key={action} className="p-3 text-center">
                        {mod.actions.includes(action) ? (
                          <input
                            type="checkbox"
                            checked={isChecked(mod.key, action)}
                            disabled={readOnly}
                            onChange={(e) => toggle(mod.key, action, e.target.checked)}
                            aria-label={`${mod.label}: ${ACTION_LABELS[action]}`}
                          />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={rowAll}
                        disabled={readOnly}
                        onChange={(e) => toggleRow(mod.key, mod.actions, e.target.checked)}
                        aria-label={`${mod.label}: todo`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
          <button type="button" onClick={() => navigate('/admin/perfiles')} className="px-4 py-2 text-gray-700 hover:text-gray-900">
            {readOnly ? 'Volver' : 'Cancelar'}
          </button>
          {!readOnly && (
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-400"
            >
              <Save size={20} />
              {saving ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
