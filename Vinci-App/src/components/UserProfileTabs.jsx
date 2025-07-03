import React from 'react';
import PostCard from '../components/PostCard';


const UserProfileTabs = ({ posts, comments }) => {
  const truncate = (text, length = 100) => text.length > length ? text.slice(0, length) + '...' : text;

  return (
    <div>
      {/* Posteos */}
      <div className="mb-5">
        <h3 className="mb-3">Mis Publicaciones</h3>
        {posts && posts.length > 0 ? (
          posts.map(post => (
            <PostCard key={post._id} post={post} />
          ))
        ) : (
          <p className="text-muted">No has realizado publicaciones aún.</p>
        )}
      </div>

      {/* Comentarios */}
      <div>
        <h3 className="mb-3">Mis Comentarios</h3>
        {comments && comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment._id} className="card mb-3">
              <div className="card-body">
                {/* Post al que comentó */}
                {comment.post && (
                  <div className="d-flex mb-2 p-2 bg-light rounded">
                    <img
                      src={comment.post.author?.profilePicture || '/default-avatar.png'}
                      alt="avatar"
                      className="rounded-circle me-2"
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                    <div>
                      <strong>{comment.post.author?.firstName} {comment.post.author?.lastName}</strong> @{comment.post.author?.username}
                      <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                        {truncate(comment.post.content)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Comentario del usuario */}
                <div className="d-flex mt-2">
                  <img
                    src={comment.author?.profilePicture || '/default-avatar.png'}
                    alt="avatar"
                    className="rounded-circle me-3"
                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                  />
                  <div>
                    <strong>{comment.author?.firstName} {comment.author?.lastName}</strong> @{comment.author?.username}
                    <br />
                    <small className="text-muted">{new Date(comment.createdAt).toLocaleDateString()}</small>
                    <p className="mt-2 mb-1">{comment.content}</p>
                    <button className="btn btn-light btn-sm">
                      <i className="bi bi-hand-thumbs-up"></i> Me gusta
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted">No has realizado comentarios aún.</p>
        )}
      </div>
    </div>
  );
};

export default UserProfileTabs;
