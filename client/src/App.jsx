import { Routes, Route } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { LogIn } from './pages/LogIn';
import { Home } from './pages/Home';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Mission } from './pages/Mission';
import { NewMission } from './pages/NewMission';
import { Payment } from './pages/Payment';

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

      {/* New missions */}
      <Route
        path='/missions/new'
        element={
          <ProtectedRoute>
            <NewMission />
          </ProtectedRoute>
        }
      ></Route>
      {/*Payment path*/}
      <Route
        path='/missions/:id/pay'
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />

      {/* Missions */}
      <Route
        path='/missions/:id'
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
