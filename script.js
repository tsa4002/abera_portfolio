/* Project media loading, accessible accordion controls, and custom video players. */
(() => {
  const toggles = document.querySelectorAll('.project-toggle');

  // Keep media placeholders visible until their corresponding image has loaded.
  document.querySelectorAll('.gif-frame .gif-image').forEach((img) => {
    const frame = img.closest('.gif-frame');
    const markLoaded = () => frame && frame.classList.add('is-loaded');
    const markMissing = () => frame && frame.classList.remove('is-loaded');
    img.addEventListener('load', markLoaded);
    img.addEventListener('error', markMissing);
    if (img.complete && img.naturalWidth > 0) markLoaded();
  });

  // SVG and still-image assets use the same loading/fallback behavior.
  document.querySelectorAll('.image-asset-frame .asset-image').forEach((img) => {
    const frame = img.closest('.image-asset-frame');
    const markLoaded = () => frame && frame.classList.add('is-loaded');
    const markMissing = () => frame && frame.classList.remove('is-loaded');
    img.addEventListener('load', markLoaded);
    img.addEventListener('error', markMissing);
    if (img.complete && img.naturalWidth > 0) markLoaded();
  });

  document.querySelectorAll('.video-frame .project-video').forEach((video) => {
    const frame = video.closest('.video-frame');
    if (!frame) return;

    const centerButton = frame.querySelector('.video-play-toggle');
    const playButton = frame.querySelector('.video-bar-play');
    const muteButton = frame.querySelector('.video-mute');
    const fullscreenButton = frame.querySelector('.video-fullscreen');
    const progress = frame.querySelector('.video-progress');
    const volume = frame.querySelector('.video-volume');
    const title = centerButton?.dataset.videoTitle || video.getAttribute('aria-label') || 'Project video';

    const markReady = () => frame.classList.add('has-video');
    const markMissing = () => frame.classList.remove('has-video');

    const updatePlayState = () => {
      const playing = !video.paused && !video.ended;
      frame.classList.toggle('is-playing', playing);
      [centerButton, playButton].filter(Boolean).forEach((button) => {
        button.setAttribute('aria-pressed', String(playing));
        button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${title}`);
      });
    };

    const updateProgress = () => {
      if (!progress || !Number.isFinite(video.duration) || video.duration <= 0) return;
      progress.value = String(Math.round((video.currentTime / video.duration) * 1000));
      const percentage = (Number(progress.value) / 1000) * 100;
      progress.style.setProperty('--progress', `${percentage}%`);
    };

    const syncFullscreenLabel = () => {
      if (!fullscreenButton) return;
      const active = document.fullscreenElement === frame;
      fullscreenButton.setAttribute('aria-label', `${active ? 'Exit' : 'Enter'} fullscreen for ${title}`);
    };

    const updateVolume = () => {
      if (!muteButton) return;
      const muted = video.muted || video.volume === 0;
      muteButton.classList.toggle('is-muted', muted);
      muteButton.setAttribute('aria-pressed', String(muted));
      muteButton.setAttribute('aria-label', muted ? `Unmute ${title}` : `Mute ${title}`);
      if (volume) volume.value = String(video.muted ? 0 : video.volume);
    };

    const togglePlayback = () => {
      if (video.paused || video.ended) {
        const attempt = video.play();
        if (attempt && typeof attempt.catch === 'function') attempt.catch(updatePlayState);
      } else {
        video.pause();
      }
    };

    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('loadeddata', markReady);
    video.addEventListener('error', markMissing);
    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);
    video.addEventListener('ended', updatePlayState);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('durationchange', updateProgress);
    video.addEventListener('volumechange', updateVolume);
    document.addEventListener('fullscreenchange', syncFullscreenLabel);
    if (video.readyState >= 2) markReady();
    updatePlayState();
    updateProgress();
    updateVolume();
    syncFullscreenLabel();

    centerButton?.addEventListener('click', togglePlayback);
    playButton?.addEventListener('click', togglePlayback);
    // The video image itself is also a play/pause surface. Controls are siblings,
    // so clicking the seek bar or other controls will not trigger this handler.
    video.addEventListener('click', togglePlayback);

    frame.addEventListener('pointerenter', () => frame.classList.add('controls-visible'));
    frame.addEventListener('pointerleave', () => frame.classList.remove('controls-visible'));

    // Let the native range input manage its own pointer and keyboard behavior.
    // Its input event fires for track clicks, thumb dragging, and keyboard changes.
    const seekFromControl = () => {
      if (!progress || video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const fraction = Math.min(1, Math.max(0, Number(progress.value) / 1000));
      try {
        video.currentTime = fraction * video.duration;
      } catch (error) {
        // Some media files may not be seekable until their metadata is available.
      }
      progress.style.setProperty('--progress', `${fraction * 100}%`);
    };
    progress?.addEventListener('input', seekFromControl);
    progress?.addEventListener('change', seekFromControl);
    video.addEventListener('seeking', updateProgress);
    video.addEventListener('seeked', updateProgress);

    muteButton?.addEventListener('click', () => {
      video.muted = !(video.muted || video.volume === 0);
      updateVolume();
    });

    volume?.addEventListener('input', () => {
      const nextVolume = Math.min(1, Math.max(0, Number(volume.value)));
      video.volume = nextVolume;
      video.muted = nextVolume === 0;
      updateVolume();
    });

    fullscreenButton?.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === frame) {
          await document.exitFullscreen();
        } else if (frame.requestFullscreen) {
          await frame.requestFullscreen();
        } else if (video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
      } catch (error) {
        // Fullscreen may be unavailable in embedded or restricted browser contexts.
      }
    });
  });

  toggles.forEach((toggle) => {
    const details = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!details) return;

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        // Pause every project video before hiding its details.
        details.querySelectorAll('.project-video').forEach((video) => video.pause());
      }
      toggle.setAttribute('aria-expanded', String(!expanded));
      details.hidden = expanded;
      const action = toggle.querySelector('.project-action');
      if (action) action.textContent = expanded ? '+' : '−';
    });
  });
})();
