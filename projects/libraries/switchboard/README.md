# @epikodelabs/switchboard

Frame-first navigation primitives for standalone Angular applications.

Switchboard models an application as named frames. A frame owns lifecycle hooks, named companion outlets, child frames, transition rules, an optional server-delivery policy, and its URL projection. This keeps the navigation contract close to the feature it describes instead of spreading it among a URL table, guards, and component wiring.

