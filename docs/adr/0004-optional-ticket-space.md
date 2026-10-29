# Make Ticket Space optional

Reporters may know the Building before confirming the exact Space. Ticket Space is therefore optional, and the database permits Tickets without a Space. This trades complete location data for lower friction during intake; reintroducing a required Space later will require a migration to resolve historical Tickets without one.
