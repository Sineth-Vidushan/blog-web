import { Routes, Route, Navigate } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateBlog from "./pages/CreateBlog";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Navbar from "./components/Navbar";
import Account from "./pages/Account";
import PostDetail from "./pages/PostDetail";
import SavedBlogs from "./pages/SavedBlogs";
import Settings from "./pages/Settings";
import VideoFeed from "./pages/VideoFeed";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Home />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Feed />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/create"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <CreateBlog />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Account />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/saved"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <SavedBlogs />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Settings />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/videos"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <VideoFeed />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/post/:id"
        element={
          <>
            <Navbar />
            <PostDetail />
          </>
        }
      />
    </Routes>
  );
}

export default App;
