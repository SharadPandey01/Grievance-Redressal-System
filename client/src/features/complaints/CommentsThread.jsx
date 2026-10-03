import { useState, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Lock,
  EyeOff,
  RotateCw,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Textarea, Badge, Spinner, Skeleton } from '../../components/ui';
import { getComments, postComment } from '../../api/comments';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { timeAgo, formatDateTime } from '../../lib/format';
import { classNames } from '../../lib/classNames';

export function CommentsThread({ complaintId, isClosed = false, className = '' }) {
  const { user, role } = useAuth();
  const canWriteInternal = role === 'officer' || role === 'admin';

  // Composer state
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load comments via useFetch
  const fetchComments = useCallback(() => {
    if (!complaintId) return Promise.resolve([]);
    return getComments(complaintId);
  }, [complaintId]);

  const {
    data: commentsData,
    loading,
    error: fetchError,
    refetch,
  } = useFetch(fetchComments, [complaintId], { pollMs: 30000 });

  const comments = Array.isArray(commentsData) ? commentsData : [];

  // Submit new comment
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    if (text.trim().length > 1000) {
      toast.error('Comment cannot exceed 1000 characters');
      return;
    }

    setSubmitting(true);
    try {
      await postComment(complaintId, {
        text: text.trim(),
        isInternal: canWriteInternal ? isInternal : false,
      });
      setText('');
      setIsInternal(false);
      toast.success(isInternal ? 'Internal note added' : 'Comment posted');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={classNames('overflow-hidden', className)}>
      <Card.Header className="pb-4">
        <div className="flex items-center justify-between">
          <Card.Title className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <span>Discussion & Activity Thread</span>
          </Card.Title>
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="sm">
              {comments.length} {comments.length === 1 ? 'message' : 'messages'}
            </Badge>
            <button
              type="button"
              onClick={refetch}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Refresh discussion"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Card.Description>
          Communicate with assigned grievance officers and administrators.
        </Card.Description>
      </Card.Header>

      <Card.Content className="space-y-6 pt-2">
        {/* ── Comments List ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4 py-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl border border-slate-100 bg-white">
                <Skeleton variant="circular" width="36px" height="36px" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton width="120px" height="14px" />
                    <Skeleton width="60px" height="12px" />
                  </div>
                  <Skeleton width="90%" height="14px" />
                  <Skeleton width="60%" height="14px" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-center space-y-2">
            <p className="text-xs font-semibold text-rose-700">
              {fetchError.message || 'Failed to load comments'}
            </p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry Loading Comments
            </Button>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-slate-500">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-medium">No comments posted yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Start the discussion or ask questions regarding this complaint.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {comments.map((comment) => {
              const isOfficerOrAdmin = ['officer', 'admin'].includes(comment.author?.role);
              const isCurrentUser = comment.author?._id === user?._id;
              const isInternalNote = comment.isInternal === true;

              return (
                <div
                  key={comment._id}
                  className={classNames(
                    'rounded-xl p-4 transition-all duration-150 border',
                    isInternalNote
                      ? 'border-amber-200 bg-amber-50/60 ring-1 ring-amber-300/40'
                      : isCurrentUser
                      ? 'border-indigo-100 bg-indigo-50/20'
                      : 'border-slate-200/80 bg-white shadow-xs'
                  )}
                >
                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={classNames(
                          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs',
                          isInternalNote
                            ? 'bg-amber-600'
                            : isOfficerOrAdmin
                            ? 'bg-indigo-600'
                            : 'bg-slate-700'
                        )}
                      >
                        {comment.author?.name ? comment.author.name[0].toUpperCase() : 'U'}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {comment.author?.name || 'Anonymous'}
                        </span>

                        {comment.author?.role && (
                          <span
                            className={classNames(
                              'rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase',
                              comment.author.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : comment.author.role === 'officer'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {comment.author.role}
                          </span>
                        )}

                        {isInternalNote && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                            <EyeOff className="h-3 w-3" />
                            Internal Note (Staff Only)
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className="text-[11px] text-slate-400"
                      title={formatDateTime(comment.createdAt)}
                    >
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>

                  {/* Comment Body */}
                  <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed pl-9">
                    {comment.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Composer Form ─────────────────────────────────────────────────── */}
        <div className="pt-2">
          {isClosed ? (
            <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-4 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <Info className="h-4 w-4 text-slate-400" />
              <span>This grievance is <strong>Closed</strong>. New comments and replies are disabled.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Textarea
                  rows={3}
                  placeholder="Type a message, update, or inquiry..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  disabled={submitting}
                  className="text-xs sm:text-sm resize-y"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-4">
                  {canWriteInternal && (
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100/80 transition-colors">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                      />
                      <span className="flex items-center gap-1">
                        <Lock className="h-3 w-3 text-amber-700" />
                        Internal note (hidden from complainant)
                      </span>
                    </label>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {text.length}/1000 characters
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting || !text.trim()}
                  icon={submitting ? Spinner : Send}
                >
                  {submitting ? 'Posting...' : isInternal ? 'Post Internal Note' : 'Send Message'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

export default CommentsThread;
