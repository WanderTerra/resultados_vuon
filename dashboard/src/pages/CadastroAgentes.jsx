import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import Loading from '../components/Loading';

const CadastroAgentes = () => {
    const [agentes, setAgentes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        numero_agente: '',
        nome: '',
        fixo_carteira: false,
        status: 'ativo'
    });
    const [showForm, setShowForm] = useState(false);

    // Buscar agentes ao carregar
    useEffect(() => {
        buscarAgentes();
    }, []);

    const buscarAgentes = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_ENDPOINTS.agentes, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setAgentes(data);
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Erro ao buscar agentes');
            }
        } catch (error) {
            console.error('Erro ao buscar agentes:', error);
            setError('Erro ao buscar agentes: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (error) setError('');
        if (success) setSuccess('');
    };

    const resetForm = () => {
        setFormData({
            numero_agente: '',
            nome: '',
            fixo_carteira: false,
            status: 'ativo'
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (agente) => {
        setFormData({
            numero_agente: agente.numero_agente,
            nome: agente.nome || '',
            fixo_carteira: agente.fixo_carteira === 1 || agente.fixo_carteira === true,
            status: agente.status
        });
        setEditingId(agente.id);
        setShowForm(true);
        setError('');
        setSuccess('');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja remover este agente?')) {
            return;
        }

        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_ENDPOINTS.agenteById(id), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setSuccess('Agente removido com sucesso!');
                buscarAgentes();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Erro ao remover agente');
            }
        } catch (error) {
            console.error('Erro ao remover agente:', error);
            setError('Erro ao remover agente: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.numero_agente || formData.numero_agente.trim() === '') {
            setError('Número do agente é obrigatório');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = editingId 
                ? API_ENDPOINTS.agenteById(editingId)
                : API_ENDPOINTS.agentes;
            
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    numero_agente: formData.numero_agente.trim(),
                    nome: formData.nome.trim() || null,
                    fixo_carteira: formData.fixo_carteira,
                    status: formData.status
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(editingId ? 'Agente atualizado com sucesso!' : 'Agente cadastrado com sucesso!');
                resetForm();
                buscarAgentes();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message || 'Erro ao salvar agente');
            }
        } catch (error) {
            console.error('Erro ao salvar agente:', error);
            setError('Erro ao salvar agente: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const agentesFixos = agentes.filter(a => a.fixo_carteira === 1 || a.fixo_carteira === true);
    const agentesAtivos = agentes.filter(a => a.status === 'ativo');

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Cadastro de Agentes</h2>
                    <p className="text-slate-500">Gerencie os agentes da carteira Vuon</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(!showForm);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <UserPlus size={20} />
                    {showForm ? 'Cancelar' : 'Novo Agente'}
                </button>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Total de Agentes</p>
                            <p className="text-2xl font-bold text-slate-800">{agentes.length}</p>
                        </div>
                        <Users className="text-blue-500" size={32} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Agentes Fixos</p>
                            <p className="text-2xl font-bold text-green-600">{agentesFixos.length}</p>
                        </div>
                        <CheckCircle className="text-green-500" size={32} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Agentes Ativos</p>
                            <p className="text-2xl font-bold text-blue-600">{agentesAtivos.length}</p>
                        </div>
                        <Users className="text-blue-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Mensagens */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <CheckCircle size={20} />
                    <span>{success}</span>
                </div>
            )}

            {/* Formulário */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                        {editingId ? 'Editar Agente' : 'Novo Agente'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Número do Agente <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="numero_agente"
                                    value={formData.numero_agente}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: 123"
                                    required
                                    disabled={!!editingId}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nome (opcional)
                                </label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome do agente"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="fixo_carteira"
                                    id="fixo_carteira"
                                    checked={formData.fixo_carteira}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="fixo_carteira" className="text-sm font-medium text-slate-700">
                                    Fixo da Carteira Vuon
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Salvando...' : (editingId ? 'Atualizar' : 'Cadastrar')}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabela de Agentes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800">Lista de Agentes</h3>
                </div>
                {loading && agentes.length === 0 ? (
                    <div className="p-8">
                        <Loading message="Carregando agentes..." />
                    </div>
                ) : agentes.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <Users size={48} className="mx-auto mb-4 text-slate-300" />
                        <p>Nenhum agente cadastrado ainda.</p>
                        <p className="text-sm mt-2">Clique em "Novo Agente" para começar.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Número</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Nome</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Fixo Carteira</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {agentes.map((agente) => (
                                    <tr key={agente.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                            {agente.numero_agente}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {agente.nome || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {agente.fixo_carteira === 1 || agente.fixo_carteira === true ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle size={14} className="mr-1" />
                                                    Sim
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    <XCircle size={14} className="mr-1" />
                                                    Não
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {agente.status === 'ativo' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Ativo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    Inativo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(agente)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(agente.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Remover"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Aviso sobre quartis */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="text-sm font-medium text-yellow-800">Importante sobre Quartis</p>
                        <p className="text-sm text-yellow-700 mt-1">
                            A página de Quartis mostrará apenas os agentes marcados como <strong>"Fixo da Carteira Vuon"</strong>. 
                            Certifique-se de marcar os 22 agentes fixos corretamente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CadastroAgentes;

