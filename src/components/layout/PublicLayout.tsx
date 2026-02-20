import { Outlet, Link } from 'react-router-dom';
import { Menu, X, Home, Building, Phone, User } from 'lucide-react';
import { useState } from 'react';

export const PublicLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            Inmobiliaria Bryan
          </Link>
          
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-600 hover:text-blue-600 flex items-center gap-2">
              <Home size={20} /> Inicio
            </Link>
            <Link to="/propiedades" className="text-gray-600 hover:text-blue-600 flex items-center gap-2">
              <Building size={20} /> Propiedades
            </Link>
            <Link to="/contacto" className="text-gray-600 hover:text-blue-600 flex items-center gap-2">
              <Phone size={20} /> Contacto
            </Link>
            <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <User size={20} /> Login
            </Link>
          </div>

          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t p-4 space-y-4">
            <Link to="/" className="block text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
              Inicio
            </Link>
            <Link to="/propiedades" className="block text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
              Propiedades
            </Link>
            <Link to="/contacto" className="block text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
              Contacto
            </Link>
            <Link to="/login" className="block text-blue-600 font-semibold" onClick={() => setIsMenuOpen(false)}>
              Login
            </Link>
          </div>
        )}
      </header>

      <main className="flex-grow bg-gray-50">
        <Outlet />
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} Inmobiliaria Bryan. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
