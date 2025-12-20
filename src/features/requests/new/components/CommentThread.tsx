
import React, { useEffect, useRef } from 'react';
import { Activity, User } from '../../../../types';
import { Avatar } from '../../../../components/ui/Avatar';
import { PencilIcon } from '../../../../components/icons/PencilIcon';
import { TrashIcon } from '../../../../components/icons/TrashIcon';
import { ReplyIcon } from '../../../../components/icons/ReplyIcon';

interface CommentThreadProps {
    activities: Activity[];
    allActivities: Activity[];
    level: number;
    onStartReply: (activity: Activity) => void;
    onStartEdit: (activity: Activity) => void;
    onDelete: (activity: Activity) => void;
    currentUser: User;
    editingActivityId: number | null;
    editText: string;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onSetEditText: (text: string) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ activities, allActivities, level, onStartReply, onStartEdit, onDelete, currentUser, editingActivityId, editText, onSaveEdit, onCancelEdit, onSetEditText }) => {
    const editInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = editInputRef.current;
        if (textarea) {
            textarea.focus();
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        }
    }, [editingActivityId]);

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSaveEdit();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancelEdit();
        }
    };
    
    const formatRelativeTime = (isoDate: string) => {
        const date = new Date(isoDate);
        const now = new Date();
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        if (diffSeconds < 60) return `${diffSeconds}d lalu`;
        const diffMinutes = Math.round(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m lalu`;
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}j lalu`;
        return `${Math.round(diffHours / 24)}h lalu`;
    };

    return (
        <div className="space-y-4 relative">
            {activities.map(activity => {
                const replies = allActivities.filter(reply => reply.parentId === activity.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const isEditingThis = editingActivityId === activity.id;

                if (activity.type === 'status_change') {
                    return (
                        <div key={activity.id} className="relative text-center my-8">
                            <hr className="border-slate-200 absolute top-1/2 left-0 w-full -z-10" />
                            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100 rounded-full py-0.5">{formatRelativeTime(activity.timestamp)}</span>
                        </div>
                    );
                }

                if (activity.type === 'revision') {
                    return (
                        <div key={activity.id} className={`flex items-start space-x-3 ${level > 0 ? 'ml-10' : ''}`}>
                             <div className="relative">
                                {/* Vertical Line for Thread */}
                                {replies.length > 0 && <div className="absolute top-8 left-1/2 w-0.5 h-full bg-slate-200 -z-10"></div>}
                                <Avatar name={activity.author} className="w-8 h-8 flex-shrink-0 text-xs shadow-sm ring-2 ring-white" />
                            </div>
                            <div className="flex-1">
                                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl shadow-sm relative">
                                    {/* Triangle Pointer */}
                                    <div className="absolute top-3 -left-1.5 w-3 h-3 bg-amber-50/70 border-l border-t border-amber-200 transform -rotate-45"></div>
                                    
                                    <div className="flex items-center justify-between mb-3 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-amber-100 text-amber-700 rounded-md">
                                                <PencilIcon className="w-3 h-3" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-800">{activity.author} <span className="font-normal text-slate-500">memberikan revisi</span></p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold">{formatRelativeTime(activity.timestamp)}</p>
                                    </div>
                                    <div className="space-y-3 relative z-10">
                                        {activity.payload.revisions?.map((rev, index) => {
                                            const rejectedQuantity = rev.originalQuantity - rev.approvedQuantity;
                                            const isFullyRejected = rev.approvedQuantity === 0;

                                            return (
                                                <div key={index} className="text-sm border-t border-amber-200/50 pt-2 first:border-t-0 first:pt-0">
                                                    <p className="font-bold text-slate-800 text-xs mb-1">{rev.itemName}</p>
                                                    
                                                    {isFullyRejected ? (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase text-[10px] border border-red-100">Ditolak</span>
                                                            <span className="text-slate-400 line-through font-medium">{rev.originalQuantity} diajukan</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                                            <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase text-[10px] border border-amber-200">Revisi</span>
                                                            <span className="text-slate-400 line-through font-medium">{rev.originalQuantity} diajukan</span>
                                                            <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{rev.approvedQuantity} disetujui</span>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-amber-900/80 italic mt-2 bg-white/50 p-2 rounded border border-amber-100/50">"{rev.reason}"</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                return (
                    <div key={activity.id} className="relative group">
                        <div className={`flex items-start space-x-3 ${level > 0 ? 'ml-10' : ''}`}>
                            <div className="relative">
                                {/* Vertical Line for Thread */}
                                {replies.length > 0 && <div className="absolute top-8 left-1/2 w-0.5 h-full bg-slate-200 -z-10"></div>}
                                <Avatar name={activity.author} className="w-8 h-8 flex-shrink-0 text-xs shadow-sm ring-2 ring-white" />
                            </div>
                            
                            <div className="flex-1">
                                {isEditingThis ? (
                                     <div className="bg-white border border-tm-primary ring-2 ring-tm-primary/10 rounded-xl p-3 shadow-md z-20 relative">
                                        <textarea
                                            ref={editInputRef}
                                            value={editText}
                                            onChange={e => {
                                                onSetEditText(e.target.value);
                                                if (editInputRef.current) {
                                                    editInputRef.current.style.height = 'auto';
                                                    editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
                                                }
                                            }}
                                            onKeyDown={handleEditKeyDown}
                                            rows={1}
                                            style={{ overflow: 'hidden' }}
                                            className="block w-full text-sm text-slate-800 bg-transparent border-none p-0 focus:ring-0 resize-none placeholder:text-slate-400"
                                        />
                                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                                            <button onClick={onSaveEdit} className="px-3 py-1 text-xs font-bold text-white bg-tm-primary rounded-md shadow-sm hover:bg-tm-primary-hover">Simpan</button>
                                            <button onClick={onCancelEdit} className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-md">Batal</button>
                                            <span className="text-[10px] text-slate-400 ml-auto">
                                                Tekan <kbd className="font-sans font-bold">Enter</kbd>
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all z-10">
                                        {/* Triangle Pointer */}
                                        <div className="absolute top-3 -left-1.5 w-3 h-3 bg-white border-l border-t border-slate-200 transform -rotate-45 group-hover:border-slate-300 transition-colors"></div>

                                        <div className="flex items-center justify-between mb-1 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-slate-900">{activity.author}</p>
                                                <span className="text-[10px] font-medium text-slate-400">{formatRelativeTime(activity.timestamp)}</span>
                                            </div>
                                            
                                            {/* Action Buttons - Visible on Hover */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onStartReply(activity)} className="p-1 text-slate-400 hover:text-tm-primary hover:bg-blue-50 rounded" title="Balas"><ReplyIcon className="w-3.5 h-3.5"/></button>
                                                {currentUser.name === activity.author && (
                                                    <>
                                                        <button onClick={() => onStartEdit(activity)} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Edit"><PencilIcon className="w-3.5 h-3.5"/></button>
                                                        <button onClick={() => onDelete(activity)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed relative z-10">{activity.payload.text}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {replies.length > 0 && (
                            <div className="mt-3">
                                <CommentThread
                                    activities={replies}
                                    allActivities={allActivities}
                                    level={level + 1}
                                    onStartReply={onStartReply}
                                    onStartEdit={onStartEdit}
                                    onDelete={onDelete}
                                    currentUser={currentUser}
                                    editingActivityId={editingActivityId}
                                    editText={editText}
                                    onSaveEdit={onSaveEdit}
                                    onCancelEdit={onCancelEdit}
                                    onSetEditText={onSetEditText}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
