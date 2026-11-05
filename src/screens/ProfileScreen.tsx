import React, { useState } from 'react';
import { USER_NAME_MAX_LENGTH, validateUserName } from '../api/identity.ts';

interface ProfileScreenProps {
  userName: string | null;
  onSave: (name: string | null) => void;
  onCancel: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ userName, onSave, onCancel }) => {
  const [name, setName] = useState(userName ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const validationError = validateUserName(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(trimmed || null);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-6 shadow-xs border border-outline-variant/30 flex flex-col gap-4"
      >
        <div>
          <h1 className="text-xl font-bold text-on-surface">Seu nome</h1>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            Fica registrado como responsável pelas alterações no histórico das User Stories. Não é um login: o
            sistema ainda não tem contas nem controle de acesso.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="input-user-name" className="text-xs font-semibold text-on-surface">
            Nome
          </label>
          <input
            id="input-user-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={USER_NAME_MAX_LENGTH}
            placeholder="Como você quer aparecer no histórico"
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? 'user-name-error' : undefined}
            className="w-full px-3.5 py-2.5 bg-surface rounded-lg text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 shadow-xs"
          />
          {error && (
            <span id="user-name-error" role="alert" className="text-xs text-error">
              {error}
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};
