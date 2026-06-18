import { Routes, Route } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { LogIn } from './pages/LogIn';
import { Home } from './pages/Home';
import { ProtectedRoute } from './components/custom/ProtectedRoute';
import { Mission } from './pages/Mission';
import { NewMission } from './pages/NewMission';
import { Payment } from './pages/Payment';
import { SearchMission } from './pages/SearchMission';
import { UserMissions } from './pages/UserMissions';

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
      <Route path='/' element={<Home />}></Route>

      {/* Missions */}
      <Route
        path='/missions/new'
        element={
          <ProtectedRoute>
            <NewMission />
          </ProtectedRoute>
        }
      ></Route>
      <Route
        path='/missions/:id/pay'
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />
      <Route
        path='/missions/:id'
        element={
          <ProtectedRoute>
            <Mission />
          </ProtectedRoute>
        }
      ></Route>
      <Route
        path='/missions'
        element={
          <ProtectedRoute>
            <SearchMission />
          </ProtectedRoute>
        }
      ></Route>
      <Route
        path='/missions/mine'
        element={
          <ProtectedRoute>
            <UserMissions />
          </ProtectedRoute>
        }
      ></Route>
    </Routes>
  );
}

export default App;
