import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, BarChart3, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path;

    // Verificar se o usuário é "Portes admin" (único usuário autorizado)
    const isAdmin = () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return false;
            const user = JSON.parse(userStr);
            const username = user?.username || '';
            // Apenas o usuário "Portes admin" pode criar novos usuários
            return username === 'Portes admin';
        } catch {
            return false;
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
        return 'Dashboard';
    };

    return (
        <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-2xl font-bold text-blue-500">Vuon Card</h1>
                <p className="text-xs text-slate-400">Resultados</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <Link
                    to="/"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <LayoutDashboard size={20} />
                    <span className="font-medium">Dashboard</span>
                </Link>
                <Link
                    to="/bloco1"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/bloco1') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">Bloco 1</span>
                </Link>
                <Link
                    to="/bloco2"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/bloco2') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">Bloco 2</span>
                </Link>
                <Link
                    to="/bloco3"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/bloco3') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">Bloco 3</span>
                </Link>
                <Link
                    to="/wo"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/wo') ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <BarChart3 size={20} />
                    <span className="font-medium">WO</span>
                </Link>
                {isAdmin() && (
                    <Link
                        to="/cadastro-usuario"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/cadastro-usuario') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <UserPlus size={20} />
                        <span className="font-medium">Cadastrar Usuário</span>
                    </Link>
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
    );
};

const Layout = ({ children }) => {
    const location = useLocation();
    
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path === '/bloco1') return 'Bloco 1 - 61 a 90 dias';
        if (path === '/bloco2') return 'Bloco 2 - 91 a 180 dias';
        if (path === '/bloco3') return 'Bloco 3 - 181 a 360 dias';
        if (path === '/wo') return 'Bloco WO - Mais de 360 dias';
        if (path === '/cadastro-usuario') return 'Cadastrar Usuário';
        return 'Dashboard';
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />
            <div className="ml-64">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-slate-800">{getPageTitle()}</h2>
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
