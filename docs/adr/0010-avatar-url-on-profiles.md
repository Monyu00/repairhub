# Avatar URL on profiles

Personal Settings needs a self-service Avatar, so uploads go to the public `avatars` Storage bucket and the canonical URL is stored on `profiles.avatar_url`. The profile row gives the User Projection one source of truth and keeps admin-readable account state with the existing profile; `user_metadata.avatar_url` is retained only as a fallback. Uploads are validated and compressed, saved under `{userId}/{timestamp}.{extension}`, linked after the profile update succeeds, and the previous object is removed. Only the account owner can replace or remove its Avatar.
