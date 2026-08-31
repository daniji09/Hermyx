import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/custom/routes/ProtectedRoute';
import { Navbar } from './components/custom/Navbar';
import { Footer } from './components/custom/Footer';

const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const SignUp = lazyNamed(() => import('./pages/SignUp'), 'SignUp');
const LogIn = lazyNamed(() => import('./pages/LogIn'), 'LogIn');
const ForgotPassword = lazyNamed(
  () => import('./pages/ForgotPassword'),
  'ForgotPassword',
);
const AuthAction = lazyNamed(() => import('./pages/AuthAction'), 'AuthAction');
const Home = lazyNamed(() => import('./pages/Home'), 'Home');
const Mission = lazyNamed(() => import('./pages/Service'), 'Mission');
const NewMission = lazyNamed(
  () => import('./pages/ServiceCreate'),
  'NewMission',
);
const Payment = lazyNamed(() => import('./pages/Payment'), 'Payment');
const SearchMission = lazyNamed(
  () => import('./pages/ServiceSearch'),
  'SearchMission',
);
const UserMissions = lazyNamed(
  () => import('./pages/UserServices'),
  'UserMissions',
);
const PublicProfile = lazyNamed(
  () => import('./pages/PublicProfile'),
  'PublicProfile',
);
const MyProfile = lazyNamed(() => import('./pages/MyProfile'), 'MyProfile');
const Notifications = lazyNamed(
  () => import('./pages/Notifications'),
  'Notifications',
);
const SearchUsers = lazyNamed(
  () => import('./pages/SearchUsers'),
  'SearchUsers',
);
const EditMission = lazyNamed(
  () => import('./pages/ServiceEdit'),
  'EditMission',
);
const StripeSuccess = lazyNamed(
  () => import('./pages/StripeConnectSuccess'),
  'StripeSuccess',
);
const Conversation = lazyNamed(
  () => import('./pages/Conversation'),
  'Conversation',
);
const Conversations = lazyNamed(
  () => import('./pages/Conversations'),
  'Conversations',
);
const Reports = lazyNamed(() => import('./pages/Reports'), 'Reports');
const Report = lazyNamed(() => import('./pages/Report'), 'Report');
const Dispute = lazyNamed(() => import('./pages/Dispute'), 'Dispute');
const Disputes = lazyNamed(() => import('./pages/Disputes'), 'Disputes');
const NotFound = lazyNamed(() => import('./pages/NotFound'), 'NotFound');
const Terms = lazyNamed(() => import('./pages/LegalPages'), 'Terms');
const LegalNotice = lazyNamed(
  () => import('./pages/LegalPages'),
  'LegalNotice',
);
const PrivacyPolicy = lazyNamed(
  () => import('./pages/LegalPages'),
  'PrivacyPolicy',
);
const CookiePolicy = lazyNamed(
  () => import('./pages/LegalPages'),
  'CookiePolicy',
);
const CommunityGuidelines = lazyNamed(
  () => import('./pages/LegalPages'),
  'CommunityGuidelines',
);

function App() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <main
            className='flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 text-muted-foreground'
            role='status'
          >
            Loading...
          </main>
        }
      >
        <Routes>
          {/* --- Public routes --- */}
          {/* Home */}
          <Route path='/' element={<Home />}></Route>
          <Route path='/services' element={<SearchMission />}></Route>
          <Route path='/auth/action' element={<AuthAction />}></Route>
          <Route path='/terms' element={<Terms />}></Route>
          <Route path='/legal' element={<LegalNotice />}></Route>
          <Route path='/privacy' element={<PrivacyPolicy />}></Route>
          <Route path='/cookies' element={<CookiePolicy />}></Route>
          <Route
            path='/community-guidelines'
            element={<CommunityGuidelines />}
          ></Route>

          {/* --- Authentication routes (not log in needed) --- */}
          <Route element={<ProtectedRoute reverseLogic />}>
            {/* Authentication */}
            <Route path='/signup' element={<SignUp />}></Route>
            <Route path='/login' element={<LogIn />}></Route>
            <Route path='/forgot-password' element={<ForgotPassword />}></Route>
          </Route>

          {/* --- Protected routes (log in needed) --- */}
          <Route element={<ProtectedRoute />}>
            {/* Read-only routes available to users and administrators */}
            <Route path='/services/:id' element={<Mission />}></Route>
            <Route path='/users/search' element={<SearchUsers />} />
            <Route path='/users/:username' element={<PublicProfile />} />
            <Route path='/disputes/:id' element={<Dispute />} />
          </Route>

          {/* --- Regular user routes (administrators are read-only) --- */}
          <Route element={<ProtectedRoute requireRegularUser />}>
            {/* Services */}
            <Route path='/services/new' element={<NewMission />}></Route>
            <Route path='/services/:id/pay' element={<Payment />} />
            <Route path='/services/:id/edit' element={<EditMission />}></Route>
            <Route path='/services/mine' element={<UserMissions />}></Route>

            {/* Users */}
            <Route path='/profile' element={<MyProfile />} />
            <Route path='/notifications' element={<Notifications />} />
            <Route path='/stripe/connect/success' element={<StripeSuccess />} />
            <Route
              path='/conversations/:conversationId'
              element={<Conversation />}
            />
            <Route path='/conversations' element={<Conversations />} />
            <Route path='/disputes' element={<Disputes />} />
          </Route>

          {/* --- Admin routes (admin role needed) --- */}
          <Route element={<ProtectedRoute requireAdmin={true} />}>
            <Route path='/reports' element={<Reports />}></Route>
            <Route path='/reports/:id' element={<Report />}></Route>
          </Route>

          {/* --- Catch routes --- */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Suspense>
      <Footer />
    </>
  );
}

export default App;
