
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./Pages/LandingPage";
import Auth from "./Pages/Auth";
import Home from "./Pages/Home";
import Profile from "./Pages/Profile";
import NotesRepository from "./Pages/NotesRepository";
import QnAForum from "./Pages/QnAForum";
import { RoomsLobby, StudyRoom, NewRoomRedirect } from "./Pages/StudyRooms";
import NewMeetingForm from "./Pages/NewMeetingForm";
import TagSearch from "./Pages/TagSearch";
import ResourceLibrary from "./Pages/ResourceLibrary";
import MyResources from "./Pages/MyResources";
import TodoList from "./Pages/TodoList";
import AIFileCheck from "./Pages/AIFileCheck";
import AIUsageChecker from "./Pages/AIUsageChecker";
import HumanizeWriting from "./Pages/HumanizeWriting";
import AdminDashboard from './Pages/AdminDashboard.jsx';
import Messages from "./Pages/Messages";
import Groups from "./Pages/Groups";
import GroupChat from "./Pages/GroupChat";
import PointsLeaderboard from "./Pages/PointsLeaderboard";
import AIChatbot from "./Components/AIChatbot";


function AppContent() {
  const location = useLocation();
  const hideChatbot = ["/", "/login", "/signup"].includes(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notes" element={<NotesRepository />} />
        <Route path="/forum" element={<QnAForum />} />
        <Route path="/rooms" element={<RoomsLobby />} />
        <Route path="/rooms/new" element={<NewRoomRedirect />} />
        <Route path="/rooms/:roomId" element={<StudyRoom />} />
        <Route path="/rooms/newform" element={<NewMeetingForm />} />
        <Route path="/search" element={<TagSearch />} />
        <Route path="/resources" element={<ResourceLibrary />} />
        <Route path="/my-resources" element={<MyResources />} />
        <Route path="/to-do-list" element={<TodoList />} />
        <Route path="/ai-check" element={<AIFileCheck />} />
        <Route path="/ai-usage" element={<AIUsageChecker />} />
        <Route path="/humanize" element={<HumanizeWriting />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/group/:id" element={<GroupChat />} />
        <Route path="/points-leaderboard" element={<PointsLeaderboard />} />
      </Routes>
      {!hideChatbot && <AIChatbot />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
