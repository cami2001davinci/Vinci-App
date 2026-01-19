// src/pages/Home.jsx
import { useEffect, useState, useRef } from "react";
import axios from "../api/axiosInstance";
import ThreeColumnLayout from "../components/ThreeColumnLayout";
import Sidebar from "../components/SideBar";
import PostCard from "../components/PostCard";
import RightColumn from "../components/RightColumn";

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const idsRef = useRef(new Set());

  const loadPosts = async () => {
    try {
      const res = await axios.get("/posts");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];

      setPosts(items);

      const newSet = new Set();
      for (const p of items) {
        if (p && p._id) newSet.add(p._id);
      }
      idsRef.current = newSet;

      setPendingPosts([]);
      setShowNewBanner(false);
    } catch (err) {
      console.error("Error al cargar posts:", err);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleIncomingPost = (post) => {
    if (!post || !post._id) return;
    if (idsRef.current.has(post._id)) return;

    idsRef.current.add(post._id);
    setPendingPosts((prev) => [post, ...prev]);
    setShowNewBanner(true);
  };

  useEffect(() => {
    const handler = (e) => {
      const { post } = e.detail || {};
      if (!post) return;
      handleIncomingPost(post);
    };

    window.addEventListener("vinci:post-created", handler);
    return () => window.removeEventListener("vinci:post-created", handler);
  }, []);

  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel("vinci-posts");
      bc.onmessage = (e) => {
        const msg = e?.data;
        if (msg?.type === "created" && msg?.payload) {
          handleIncomingPost(msg.payload);
        }
      };
    } catch (_) {}

    const onStorage = (ev) => {
      if (ev.key !== "vinci:newPost" || !ev.newValue) return;
      try {
        const data = JSON.parse(ev.newValue);
        if (data?.post) {
          handleIncomingPost(data.post);
        }
      } catch (_) {}
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        bc && bc.close();
      } catch (_) {}
    };
  }, []);

  const handlePostChanged = () => {
    loadPosts();
  };

  const updatePostInLists = (nextPost) => {
    if (!nextPost?._id) return;

    setPosts((prev) => {
      let changed = false;
      const mapped = prev.map((p) => {
        if (p._id === nextPost._id) {
          changed = true;
          return { ...p, ...nextPost };
        }
        return p;
      });
      return changed ? mapped : prev;
    });

    setPendingPosts((prev) => {
      let changed = false;
      const mapped = prev.map((p) => {
        if (p._id === nextPost._id) {
          changed = true;
          return { ...p, ...nextPost };
        }
        return p;
      });
      return changed ? mapped : prev;
    });
  };

  const removePostEverywhere = (postId) => {
    if (!postId) return;
    setPosts((prev) => prev.filter((p) => p._id !== postId));
    setPendingPosts((prev) => {
      const filtered = prev.filter((p) => p._id !== postId);
      if (!filtered.length) {
        setShowNewBanner(false);
      }
      return filtered;
    });
    idsRef.current.delete(postId);
  };

  useEffect(() => {
    const handlePostUpdated = (e) => {
      const detail = e.detail || {};
      const nextPost = detail.post || detail;
      if (!nextPost?._id) return;
      updatePostInLists(nextPost);
    };

    const handlePostDeleted = (e) => {
      const { postId } = e.detail || {};
      if (!postId) return;
      removePostEverywhere(postId);
    };

    window.addEventListener("vinci:post-updated", handlePostUpdated);
    window.addEventListener("vinci:post-deleted", handlePostDeleted);
    return () => {
      window.removeEventListener("vinci:post-updated", handlePostUpdated);
      window.removeEventListener("vinci:post-deleted", handlePostDeleted);
    };
  }, []);

  const applyPendingPosts = () => {
    if (!pendingPosts.length) return;

    setPosts((prev) => {
      const merged = [...pendingPosts, ...prev];
      const seen = new Set();
      const unique = [];

      for (const p of merged) {
        if (!p || !p._id) continue;
        if (seen.has(p._id)) continue;
        seen.add(p._id);
        unique.push(p);
      }

      unique.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      return unique;
    });

    setPendingPosts([]);
    setShowNewBanner(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {showNewBanner && pendingPosts.length > 0 && (
        <button
          type="button"
          className="btn btn-primary new-posts-banner shadow"
          onClick={applyPendingPosts}
        >
          <i className="bi bi-arrow-up-circle-fill me-2" />
          {pendingPosts.length === 1
            ? "1 nuevo post. Ver arriba"
            : `${pendingPosts.length} posts nuevos. Ver arriba`}
        </button>
      )}

      <ThreeColumnLayout
        left={<Sidebar />}
        center={
          <div className="d-flex flex-column gap-3">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onPostChanged={handlePostChanged}
                origin="home"
                canLike={true}
                canComment={false}
              />
            ))}
          </div>
        }
        right={<RightColumn />}
      />
    </>
  );
};

export default HomePage;
