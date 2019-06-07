export = bigscreenplayer;
export as namespace bigscreenplayer;

declare namespace bigscreenplayer {
    export interface BigscreenPlayer {
        init(): void;
        tearDown(): void;
        registerForStateChanges(callback: Function): void;
        unregisterForStateChanges(callback: Function): void;
        registerForTimeUpdates(callback: Function): void;
        unregisterForTimeUpdates(callback: Function): void;
        setCurrentTime(time: number): void;
        getCurrentTime(): number;
        setSubtitlesEnabled(state: boolean): void;
        isSubtitlesEnabled(): boolean;
        isSubtitlesAvailable(): boolean;
        setTransportControlsPosition(position: TransportControlPosition): void;
        canSeek(): boolean;
        canPause(): boolean;
        mock(opts: object): void;
        unmock(opts: object): void;
        mockJasmine(opts: object): void;
        registerPlugin(plugin: Plugin): void;
        unregisterPlugin(plugin: Plugin): void;
        transitions(): Transistions;
        getPlayerElement(): HTMLMediaElement;
        convertEpochMsToVideoTimeSeconds(epochTime: number): number;
    }

    interface Plugin {
        onError(evt: object): void;
        onFatalError(evt: object): void;
        onErrorCleared(evt: object): void;
        onErrorHandled(evt: object): void;
        onBuffering(evt: object): void;
        onBufferingCleared(evt: object): void;
        onScreenCapabilityDetermined(evt: object): void;
        onPlayerInfoUpdated(evt: object): void;
    }

    interface Transistions {
        canBePaused(): boolean;
        canBeginSeek(): boolean;
    }

    interface MediaKind {
        AUDIO: 'audio',
        VIDEO: 'video'
    }

    interface WindowType {
        STATIC: 'staticWindow',
        GROWING: 'growingWindow',
        SLIDING: 'slidingWindow'
    }

    enum TransportControlPosition {
        NONE = 0,
        CONTROLS_ONLY = 1,
        CONTROLS_WITH_INFO = 2,
        LEFT_CAROUSEL = 4,
        BOTTOM_CAROUSEL = 8,
        FULLSCREEN = 16
    };
}
