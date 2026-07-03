import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PhoneCall, Plus, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import type {
  EmergencyContact,
  EmergencyContactFormData,
} from '../../api/groups/groups.types';
import {
  addEmergencyContact,
  getEmergencyContacts,
  removeEmergencyContact,
  updateEmergencyContact,
} from '../../api/groups/groups.service';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { canManageEmergencyContacts } from '../../lib/carePermissions';
import { useAuth } from '../../contexts/AuthContext';

const emptyForm: EmergencyContactFormData = {
  name: '',
  role: '',
  phoneNumber: '',
};

function cacheKey(groupId: string): string {
  return `carecircle:emergencyContacts:${groupId}`;
}

function readCachedContacts(groupId: string): EmergencyContact[] {
  const value = localStorage.getItem(cacheKey(groupId));
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as EmergencyContact[]) : [];
  } catch {
    return [];
  }
}

function writeCachedContacts(groupId: string, contacts: EmergencyContact[]) {
  localStorage.setItem(cacheKey(groupId), JSON.stringify(contacts));
}

function EmergencyContactForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial?: EmergencyContact;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (data: EmergencyContactFormData) => Promise<void>;
}) {
  const [values, setValues] = useState<EmergencyContactFormData>(
    initial
      ? {
          name: initial.name,
          role: initial.role,
          phoneNumber: initial.phoneNumber ?? '',
        }
      : emptyForm,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.name.trim() || !values.role.trim() || !values.phoneNumber.trim()) {
      toast.error('Name, role, and phone number are required');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input
          aria-label="Contact name"
          className="h-10 rounded-lg border px-3 text-sm"
          style={{ borderColor: 'var(--color-border)' }}
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          placeholder="Name"
        />
        <input
          aria-label="Contact role"
          className="h-10 rounded-lg border px-3 text-sm"
          style={{ borderColor: 'var(--color-border)' }}
          value={values.role}
          onChange={(event) => setValues({ ...values, role: event.target.value })}
          placeholder="Role"
        />
        <input
          aria-label="Contact phone number"
          type="tel"
          className="h-10 rounded-lg border px-3 text-sm"
          style={{ borderColor: 'var(--color-border)' }}
          value={values.phoneNumber}
          onChange={(event) =>
            setValues({ ...values, phoneNumber: event.target.value })
          }
          placeholder="+44 20 7946 0000"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg border px-4 text-xs font-bold"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="h-9 rounded-lg px-4 text-xs font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function EmergencyContactsPage() {
  const { groupId } = useParams();
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? null;
  const { group, loading: groupLoading, error: groupError } = useGroupDetail(groupId);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const loadErrorToastGroupRef = useRef<string | null>(null);

  const canManage = useMemo(
    () => (group ? canManageEmergencyContacts(group.role) : false),
    [group],
  );
  const freeFormCount = contacts.filter((contact) => contact.source === 'free_form')
    .length;

  useEffect(() => {
    if (!groupId) return;
    const cached = readCachedContacts(groupId);
    if (cached.length > 0) {
      setContacts(cached);
      setUsingCache(true);
    }

    void getEmergencyContacts(groupId)
      .then((freshContacts) => {
        setContacts(freshContacts);
        writeCachedContacts(groupId, freshContacts);
        setUsingCache(false);
      })
      .catch(() => {
        if (cached.length === 0 && loadErrorToastGroupRef.current !== groupId) {
          loadErrorToastGroupRef.current = groupId;
          toast.error('Emergency contacts could not be loaded');
        }
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  if (!groupId) return <Navigate to="/groups/list" replace />;

  async function refresh(nextContacts?: EmergencyContact[]) {
    if (!groupId) return;
    if (nextContacts) {
      setContacts(nextContacts);
      writeCachedContacts(groupId, nextContacts);
      return;
    }
    const freshContacts = await getEmergencyContacts(groupId);
    setContacts(freshContacts);
    writeCachedContacts(groupId, freshContacts);
  }

  async function handleAdd(data: EmergencyContactFormData) {
    if (!groupId) return;
    try {
      const created = await addEmergencyContact(groupId, data);
      await refresh([...contacts, created]);
      setAdding(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add emergency contact');
    }
  }

  async function handleUpdate(contactId: string, data: EmergencyContactFormData) {
    if (!groupId) return;
    try {
      const updated = await updateEmergencyContact(groupId, contactId, data);
      await refresh(
        contacts.map((contact) => (contact.id === contactId ? updated : contact)),
      );
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save emergency contact');
    }
  }

  async function handleRemove(contactId: string) {
    if (!groupId) return;
    try {
      await removeEmergencyContact(groupId, contactId);
      await refresh(contacts.filter((contact) => contact.id !== contactId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove emergency contact');
    }
  }

  if (groupLoading || loading) {
    return <section>Loading emergency contacts...</section>;
  }

  if (groupError || !group) {
    return <section>Emergency contacts unavailable.</section>;
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: 'var(--color-status-critical)' }}
          >
            Emergency access
          </p>
          <h1 className="text-2xl font-extrabold">Emergency contacts</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            GP, specialists, primary carer, and emergency contacts for {group.name}.
          </p>
          {usingCache && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-hint)' }}>
              Showing cached contacts while offline or reconnecting.
            </p>
          )}
        </div>
        {canManage && freeFormCount < 2 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={16} />
            Add emergency contact
          </button>
        )}
      </header>

      {adding && (
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--color-border)' }}>
          <EmergencyContactForm
            submitLabel="Add contact"
            onCancel={() => setAdding(false)}
            onSubmit={handleAdd}
          />
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="rounded-xl border p-6 text-sm" style={{ borderColor: 'var(--color-border)' }}>
          No emergency contacts available yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {contacts.map((contact) => (
            <article
              key={`${contact.source}:${contact.id}`}
              className="rounded-xl border bg-white p-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {editingId === contact.id ? (
                <EmergencyContactForm
                  initial={contact}
                  submitLabel="Save contact"
                  onCancel={() => setEditingId(null)}
                  onSubmit={(data) => handleUpdate(contact.id, data)}
                />
              ) : (
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'var(--color-status-critical-bg)' }}
                    >
                      <ShieldAlert size={18} color="var(--color-status-critical)" />
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold">{contact.name}</h2>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {contact.role}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {contact.phoneNumber ?? 'Phone number missing'}
                      </p>
                      {!contact.phoneNumber &&
                        contact.source === 'primary_carer' &&
                        contact.ownerUserId &&
                        currentUserId === contact.ownerUserId && (
                          <Link
                            to="/settings"
                            className="mt-2 inline-block text-sm font-bold no-underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            Add your phone number in Settings
                          </Link>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {contact.phoneNumber && (
                      <a
                        href={`tel:${contact.phoneNumber.replace(/\s+/g, '')}`}
                        className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white no-underline"
                        style={{ backgroundColor: 'var(--color-status-critical)' }}
                      >
                        <PhoneCall size={16} />
                        Call
                      </a>
                    )}
                    {canManage && contact.editable && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(contact.id)}
                          className="h-10 rounded-lg border px-4 text-sm font-bold"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemove(contact.id)}
                          className="h-10 rounded-lg border px-4 text-sm font-bold"
                          style={{
                            borderColor: 'var(--color-status-critical)',
                            color: 'var(--color-status-critical)',
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
