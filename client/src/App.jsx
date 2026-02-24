import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { LogIn } from './pages/LogIn';
import { Home } from './pages/Home';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://hermyxbackend-hqb3bffcbbf7arbq.spaincentral-01.azurewebsites.net/users');

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          padding: '10px',
          backgroundColor: '#f0f0f0',
          textAlign: 'center',
          borderBottom: '1px solid #ccc',
          marginBottom: '20px',
        }}
      >
        <h2>Bienvenido</h2>
        <p>Prueba de navegación</p>

        <button
          onClick={fetchUsers}
          disabled={loading}
          style={{ padding: '8px 16px', cursor: 'pointer', marginTop: '10px' }}
        >
          {loading ? 'Cargando usuarios...' : 'Cargar lista de usuarios'}
        </button>

        {error && <p style={{ color: 'red' }}>Error: {error}</p>}

        {users.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
            {users.map((user) => (
              <li
                key={user.uid}
                style={{
                  background: 'white',
                  margin: '5px auto',
                  padding: '10px',
                  maxWidth: '300px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                }}
              >
                <strong>{user.username}</strong> <br />
                <small>{user.email}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Routes>
        <Route
          path='/signup'
          element={
            <ProtectedRoute reverseLogic>
              <SignUp />
            </ProtectedRoute>
          }
        />
        <Route
          path='/login'
          element={
            <ProtectedRoute reverseLogic>
              <LogIn />
            </ProtectedRoute>
          }
        ></Route>
        <Route
          path='/home'
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        ></Route>
      </Routes>
    </>
  );
}

export default App;
