
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./Pages/LandingPage";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import Profile from "./Pages/Profile";
import NotesRepository from "./Pages/NotesRepository";
import QnAForum from "./Pages/QnAForum";
import { RoomsLobby, StudyRoom, NewRoomRedirect } from "./Pages/StudyRooms";
import TagSearch from "./Pages/TagSearch";
import ResourceLibrary from "./Pages/ResourceLibrary";
import Home from "./Pages/Home";
import AIFileCheck from "./Pages/AIFileCheck";
import AIUsageChecker from "./Pages/AIUsageChecker";
import HumanizeWriting from "./Pages/HumanizeWriting";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notes" element={<NotesRepository />} />
        <Route path="/forum" element={<QnAForum />} />
        <Route path="/rooms" element={<RoomsLobby />} />
        <Route path="/rooms/new" element={<NewRoomRedirect />} />
        <Route path="/rooms/:roomId" element={<StudyRoom />} />
        <Route path="/search" element={<TagSearch />} />
        <Route path="/resources" element={<ResourceLibrary />} />
        <Route path="/ai-check" element={<AIFileCheck />} />
        <Route path="/ai-usage" element={<AIUsageChecker />} />
        <Route path="/humanize" element={<HumanizeWriting />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
