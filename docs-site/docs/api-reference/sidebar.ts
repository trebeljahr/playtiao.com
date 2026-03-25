import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api-reference/tiao-api",
    },
    {
      type: "category",
      label: "Authentication",
      items: [
        {
          type: "doc",
          id: "api-reference/create-a-guest-session",
          label: "Create a guest session",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/create-a-new-account",
          label: "Create a new account",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/log-in-to-an-existing-account",
          label: "Log in to an existing account",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/destroy-the-current-session",
          label: "Destroy the current session",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/get-the-current-authenticated-player",
          label: "Get the current authenticated player",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Profile",
      items: [
        {
          type: "doc",
          id: "api-reference/get-the-current-account-profile",
          label: "Get the current account profile",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/update-the-current-account-profile",
          label: "Update the current account profile",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api-reference/upload-a-profile-picture",
          label: "Upload a profile picture",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Games",
      items: [
        {
          type: "doc",
          id: "api-reference/list-the-current-players-games",
          label: "List the current player's games",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/create-a-new-multiplayer-game",
          label: "Create a new multiplayer game",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/join-an-existing-game",
          label: "Join an existing game",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/access-a-game-join-or-spectate",
          label: "Access a game (join or spectate)",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/get-a-game-snapshot",
          label: "Get a game snapshot",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/force-finish-a-game-development-only",
          label: "Force-finish a game (development only)",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Matchmaking",
      items: [
        {
          type: "doc",
          id: "api-reference/enter-matchmaking-queue",
          label: "Enter matchmaking queue",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/get-current-matchmaking-status",
          label: "Get current matchmaking status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/leave-matchmaking-queue",
          label: "Leave matchmaking queue",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Social",
      items: [
        {
          type: "doc",
          id: "api-reference/get-social-overview-friends-requests-invitations",
          label: "Get social overview (friends, requests, invitations)",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/search-for-players-by-name-or-email",
          label: "Search for players by name or email",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/send-a-friend-request",
          label: "Send a friend request",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/accept-a-friend-request",
          label: "Accept a friend request",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/decline-a-friend-request",
          label: "Decline a friend request",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/cancel-an-outgoing-friend-request",
          label: "Cancel an outgoing friend request",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/send-a-game-invitation-to-a-friend",
          label: "Send a game invitation to a friend",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/revoke-a-pending-game-invitation",
          label: "Revoke a pending game invitation",
          className: "api-method post",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
