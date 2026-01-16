import { Component, Show } from 'solid-js';
import { fileStore, SUPPORTED_EXTENSIONS } from '../stores/fileStore';

/**
 * GlobalDragOverlay Component
 * 
 * An immersive, full-screen overlay that appears when a user drags a file 
 * anywhere over the application window.
 */
export const GlobalDragOverlay: Component = () => {
    const { store } = fileStore;

    return (
        <Show when={store.state === 'hover'}>
            <div
                class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600/20 backdrop-blur-md animate-in fade-in zoom-in duration-300 pointer-events-none"
            >
                {/* Animated Background Pulse */}
                <div class="absolute inset-0 overflow-hidden pointer-events-none">
                    <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
                    <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
                    <div class="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-blue-400 to-transparent animate-pulse"></div>
                    <div class="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-transparent via-blue-400 to-transparent animate-pulse"></div>
                </div>

                <div class="relative bg-slate-900/90 border-2 border-blue-500/50 rounded-[40px] p-16 shadow-2xl flex flex-col items-center text-center max-w-2xl transform scale-110">
                    <div class="w-32 h-32 bg-blue-500/20 rounded-3xl flex items-center justify-center mb-8 animate-bounce">
                        <svg class="w-16 h-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>

                    <h2 class="text-5xl font-black text-white mb-4 tracking-tighter">
                        Drop to Profile
                    </h2>

                    <p class="text-xl text-slate-300 font-medium mb-12">
                        Release your file to start the instant analysis.
                    </p>

                    <div class="flex flex-wrap justify-center gap-3">
                        {SUPPORTED_EXTENSIONS.map(ext => (
                            <span class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-blue-400 uppercase tracking-widest">
                                {ext.replace('.', '')}
                            </span>
                        ))}
                    </div>

                    <div class="mt-12 flex items-center gap-4 py-3 px-6 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <span class="relative flex h-3 w-3">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span class="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                            Data remains local • 100% Private
                        </span>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default GlobalDragOverlay;
