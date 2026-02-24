import { Routes, Route } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { LogIn } from './pages/LogIn';
import { Home } from './pages/Home';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Mission } from './pages/Mission';

function App() {
  return (
    <Routes>
      {/* Authentication */}
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

      {/* Home */}
      <Route
        path='/home'
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      ></Route>

      {/* Missions */}
      <Route
        path='/mission/:id'
        element={
          <ProtectedRoute>
            <Mission />
          </ProtectedRoute>
        }
      ></Route>
    </Routes>
  );
}

export default App;
