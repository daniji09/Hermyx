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
import TestDashboard from './pages/TestDashboard';
import { Navbar } from './components/custom/Navbar';
import { PublicProfile } from './pages/PublicProfile';

function App() {
  return (
    <>
      <Navbar />
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
        <Route
          path='/test'
          element={
            <ProtectedRoute>
              <TestDashboard />
            </ProtectedRoute>
          }
        ></Route>
        <Route
          path='/users/:username'
          element={
            <ProtectedRoute>
              <PublicProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
