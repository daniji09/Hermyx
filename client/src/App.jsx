import { Routes, Route } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { LogIn } from './pages/LogIn';
import { Home } from './pages/Home';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <>
      <div
        style={{
          padding: '10px',
          backgroundColor: '#f0f0f0',
          textAlign: 'center',
          borderBottom: '1px solid #ccc',
        }}
      >
        <h2>Bienvenido</h2>
        <p>Prueba de navegación</p>
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
