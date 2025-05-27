import React, { useEffect, useState } from 'react';
import { getGalleryComments, addComment } from '../../services/galleryApi';
import { Comment } from '../../types/gallery';
import { useAuth } from '../../context/AuthContext';

const CommentSection: React.FC<{ galleryId: string }> = ({ galleryId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    getGalleryComments(galleryId).then(({ data }) => {
      if (data) setComments(data);
    });
  }, [galleryId]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    if (!user) return;
    await addComment(galleryId, user.id, content);
    setContent('');
    getGalleryComments(galleryId).then(({ data }) => {
      if (data) setComments(data);
    });
  };

  return (
    <div>
      <div className="font-bold mb-2">Comments</div>
      <div className="space-y-2 mb-4">
        {comments.map(c => (
          <div key={c.id} className="bg-gray-100 rounded p-2">
            <div className="text-xs text-gray-500">{c.user_id}</div>
            <div>{c.content}</div>
          </div>
        ))}
      </div>
      {isAuthenticated && (
        <div className="flex space-x-2">
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Add a comment..."
          />
          <button onClick={handleAdd} className="bg-brand-forest text-white px-4 py-2 rounded hover:bg-brand-olive">Post</button>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
