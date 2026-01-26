import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, BarChart3, UserPlus, TrendingUp, PieChart, Users, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path;

    // Verificar se o usuário tem permissões de admin
    const isAdmin = () => {
        return hasPermission('cadastrar_usuario') || hasPermission('cadastrar_agentes');
    };

    // Fechar sidebar ao clicar em link (apenas em mobile)
    const handleLinkClick = () => {
        if (window.innerWidth < 1024) { // lg breakpoint
            onClose();
        }
    };

    const handleLogout = () => {
        // Limpar todos os dados de autenticação
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Limpar também o modo de visualização salvo (opcional)
        localStorage.removeItem('dateFilter_viewMode');
        navigate('/login');
    };

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path === '/bloco1') return 'Bloco 1 - 61 a 90 dias';
        if (path === '/bloco2') return 'Bloco 2 - 91 a 180 dias';
        if (path === '/bloco3') return 'Bloco 3 - 181 a 360 dias';
        if (path === '/wo') return 'Bloco WO - Mais de 360 dias';
        if (path === '/comparativo') return 'Comparativo';
        if (path === '/quartis') return 'Quartis';
        if (path === '/cadastro-usuario') return 'Cadastrar Usuário';
        if (path === '/cadastro-agentes') return 'Cadastrar Agentes';
        return 'Dashboard';
    };

    return (
        <>
            {/* Overlay para mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}
            <div className={`h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-blue-500">Vuon Card</h1>
                    <p className="text-xs text-slate-400">Resultados</p>
                </div>
                <button
                    onClick={onClose}
                    className="lg:hidden text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <Link
                    to="/"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <LayoutDashboard size={20} />
                    <span className="font-medium">Dashboard</span>
                </Link>
                <Link
                    to="/bloco1"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/bloco1') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">Bloco 1</span>
                </Link>
                <Link
                    to="/bloco2"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/bloco2') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">Bloco 2</span>
                </Link>
                <Link
                    to="/bloco3"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/bloco3') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">Bloco 3</span>
                </Link>
                <Link
                    to="/wo"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/wo') ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">WO</span>
                </Link>
                <Link
                    to="/comparativo"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/comparativo') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <TrendingUp size={20} />
                    <span className="font-medium">Comparativo</span>
                </Link>
                <Link
                    to="/quartis"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/quartis') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <PieChart size={20} />
                    <span className="font-medium">Quartis de DDA</span>
                </Link>
                {isAdmin() && (
                    <>
                        <Link
                            to="/cadastro-usuario"
                            onClick={handleLinkClick}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/cadastro-usuario') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <UserPlus size={20} />
                            <span className="font-medium">Cadastrar Usuário</span>
                        </Link>
                        <Link
                            to="/cadastro-agentes"
                            onClick={handleLinkClick}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/cadastro-agentes') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <Users size={20} />
                            <span className="font-medium">Cadastrar Agentes</span>
                        </Link>
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors"
                >
                    <LogOut size={20} />
                    <span>Sair</span>
                </button>
            </div>
        </div>
        </>
    );
};

const Layout = ({ children }) => {
    const location = useLocation();
    
    // Estado para controlar se o sidebar está aberto
    // Por padrão, verifica o localStorage, senão assume true (aberto)
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebarOpen');
        return saved !== null ? saved === 'true' : true;
    });

    // Salvar estado no localStorage quando mudar
    useEffect(() => {
        localStorage.setItem('sidebarOpen', sidebarOpen.toString());
    }, [sidebarOpen]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path === '/bloco1') return 'Bloco 1 - 61 a 90 dias';
        if (path === '/bloco2') return 'Bloco 2 - 91 a 180 dias';
        if (path === '/bloco3') return 'Bloco 3 - 181 a 360 dias';
        if (path === '/wo') return 'Bloco WO - Mais de 360 dias';
        if (path === '/comparativo') return 'Comparativo';
        if (path === '/quartis') return 'Quartis';
        if (path === '/cadastro-usuario') return 'Cadastrar Usuário';
        if (path === '/cadastro-agentes') return 'Cadastrar Agentes';
        return 'Dashboard';
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />
            <div className={`transition-all duration-300 ease-in-out ${
                sidebarOpen ? 'lg:ml-64 ml-0' : 'ml-0'
            }`}>
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="text-slate-600 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                            aria-label="Toggle sidebar"
                        >
                            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <h2 className="text-lg font-semibold text-slate-800">{getPageTitle()}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                    </div>
                </header>
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
