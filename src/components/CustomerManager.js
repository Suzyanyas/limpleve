import { useState, useEffect } from 'react';
import { FaUsers, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/managementService';
import './CustomerManager.css';

const EMPTY_FORM = { name: '', code: '', phone: '', address: '', notes: '' };

export default function CustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = novo, objeto = editando
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // id do cliente a excluir

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await getAllCustomers();
    setCustomers(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      name: customer.name || '',
      code: customer.code || '',
      phone: customer.phone || customer.whatsapp || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome é obrigatório.'); return; }

    setSaving(true);
    if (editing) {
      const { success } = await updateCustomer(editing.id, form);
      if (success) { toast.success('Cliente atualizado!'); await load(); closeForm(); }
      else toast.error('Erro ao atualizar cliente.');
    } else {
      const result = await createCustomer(form);
      if (result.success) { toast.success('Cliente criado!'); await load(); closeForm(); }
      else if (result.error?.code === '23505') toast('Cliente já existe no cadastro.', { icon: 'ℹ️' });
      else toast.error('Erro ao criar cliente.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const { success } = await deleteCustomer(id);
    if (success) { toast.success('Cliente excluído.'); setCustomers(c => c.filter(x => x.id !== id)); }
    else toast.error('Erro ao excluir. Verifique se o cliente tem pedidos vinculados.');
    setConfirmDelete(null);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || c.whatsapp || '').includes(search)
  );

  return (
    <div className="customer-manager">
      {/* Cabeçalho */}
      <div className="cm-header">
        <div className="cm-header-left">
          <h2 className="cm-title"><FaUsers /> Clientes</h2>
          <span className="cm-count">{customers.length} cadastrados</span>
        </div>
        <div className="cm-header-right">
          <input
            className="cm-search"
            type="text"
            placeholder="Buscar por nome, código ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="cm-btn-new" onClick={openNew}><FaPlus /> Novo Cliente</button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="cm-form-card">
          <h3 className="cm-form-title">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <form onSubmit={handleSubmit} className="cm-form">
            <div className="cm-form-row">
              <div className="cm-field">
                <label>Nome *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Nome completo" required />
              </div>
              <div className="cm-field">
                <label>Código</label>
                <input name="code" value={form.code} onChange={handleChange} placeholder="Ex: D.Ivonete 6789" />
              </div>
            </div>
            <div className="cm-form-row">
              <div className="cm-field">
                <label>Telefone / WhatsApp</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" />
              </div>
              <div className="cm-field">
                <label>Endereço</label>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Rua, número, bairro" />
              </div>
            </div>
            <div className="cm-field cm-field-full">
              <label>Observações</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Anotações sobre o cliente..." rows={3} />
            </div>
            <div className="cm-form-actions">
              <button type="button" className="cm-btn-cancel" onClick={closeForm}>Cancelar</button>
              <button type="submit" className="cm-btn-save" disabled={saving}>
                {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="cm-loading">Carregando clientes...</div>
      ) : filtered.length === 0 ? (
        <div className="cm-empty">
          {search ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado ainda.'}
        </div>
      ) : (
        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Telefone</th>
                <th>Endereço</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(customer => (
                <tr key={customer.id}>
                  <td className="cm-td-name">{customer.name}</td>
                  <td>{customer.code || <span className="cm-empty-cell">—</span>}</td>
                  <td>
                    {(customer.phone || customer.whatsapp)
                      ? <a href={`https://wa.me/55${(customer.phone || customer.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="cm-whatsapp">{customer.phone || customer.whatsapp}</a>
                      : <span className="cm-empty-cell">—</span>}
                  </td>
                  <td>{customer.address || <span className="cm-empty-cell">—</span>}</td>
                  <td className="cm-td-notes">{customer.notes || <span className="cm-empty-cell">—</span>}</td>
                  <td>
                    <div className="cm-actions">
                      <button className="cm-btn-edit" onClick={() => openEdit(customer)} title="Editar"><FaEdit /></button>
                      <button className="cm-btn-delete" onClick={() => setConfirmDelete(customer.id)} title="Excluir"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="cm-confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="cm-confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="cm-confirm-text">Excluir este cliente? Esta ação não pode ser desfeita.</p>
            <div className="cm-confirm-actions">
              <button className="cm-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="cm-btn-confirm-delete" onClick={() => handleDelete(confirmDelete)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
