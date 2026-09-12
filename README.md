# QA evidence

Recordings (video with the app's own audio) made for pull requests, one folder per branch.
They are made with the headless-Chrome recorder in Meriç's `roundaround-qa` tools: the page
is screencast over CDP while everything the app sends to its Web Audio destination is tapped
and recorded, then both are muxed into an mp4. This branch shares no history with `master`.
