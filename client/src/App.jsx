import { Routes, Route } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { LogIn } from './pages/LogIn';
import { Home } from './pages/Home';
import { ProtectedRoute } from './components/custom/routes/ProtectedRoute';
import { Mission } from './pages/Mission';
import { NewMission } from './pages/MissionCreate';
import { Payment } from './pages/Payment';
import { SearchMission } from './pages/MissionSearch';
import { UserMissions } from './pages/UserMissions';
import TestDashboard from './pages/TestDashboard';
import { Navbar } from './components/custom/Navbar';
import { PublicProfile } from './pages/PublicProfile';
import { MyProfile } from './pages/MyProfile';
import { Notifications } from './pages/Notifications';
import { SearchUsers } from './pages/SearchUsers';
import { EditMission } from './pages/MissionEdit';
import { StripeSuccess } from './pages/StripeConnectSuccess';
import { Conversation } from './pages/Conversation';
import { Conversations } from './pages/Conversations';
import { Reports } from './pages/Reports';
import { Report } from './pages/Report';
import { Dispute } from './pages/Dispute';
import { Disputes } from './pages/Disputes';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* --- Public routes --- */}
        {/* Home */}
        <Route path='/' element={<Home />}></Route>

        {/* --- Authentication routes (not log in needed) --- */}
        <Route element={<ProtectedRoute reverseLogic />}>
          {/* Authentication */}
          <Route path='/signup' element={<SignUp />}></Route>
          <Route path='/login' element={<LogIn />}></Route>
        </Route>

        {/* --- Protected routes (log in needed) --- */}
        <Route element={<ProtectedRoute />}>
          {/* Read-only routes available to users and administrators */}
          <Route path='/missions/:id' element={<Mission />}></Route>
          <Route path='/missions' element={<SearchMission />}></Route>
          <Route path='/users/search' element={<SearchUsers />} />
          <Route path='/users/:username' element={<PublicProfile />} />
        </Route>

        {/* --- Regular user routes (administrators are read-only) --- */}
        <Route element={<ProtectedRoute requireRegularUser />}>
          {/* Missions */}
          <Route path='/missions/new' element={<NewMission />}></Route>
          <Route path='/missions/:id/pay' element={<Payment />} />
          <Route path='/missions/:id/edit' element={<EditMission />}></Route>
          <Route path='/missions/mine' element={<UserMissions />}></Route>

          {/* Users */}
          <Route path='/profile' element={<MyProfile />} />
          <Route path='/notifications' element={<Notifications />} />
          <Route path='/test' element={<TestDashboard />}></Route>
          <Route path='/stripe/connect/success' element={<StripeSuccess />} />
          <Route
            path='/conversations/:conversationId'
            element={<Conversation />}
          />
          <Route path='/conversations' element={<Conversations />} />
          <Route path='/disputes/:id' element={<Dispute />} />
          <Route path='/disputes' element={<Disputes />} />
        </Route>

        {/* --- Admin routes (admin role needed) --- */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route path='/reports' element={<Reports />}></Route>
          <Route path='/reports/:id' element={<Report />}></Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
