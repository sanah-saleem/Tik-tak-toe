local nk = require("nakama")

-- opcodes (used by both client and server)
local OPCODE_MOVE = 1       -- client -> server
local OPCODE_STATE = 2      -- server -> clients (snapshot)
local OPCODE_ERROR = 3      -- server -> single client
local OPCODE_REMATCH = 4

local MODULE_NAME = "tiktaktoe"

local WIN_LINES = {
  {1,2,3},{4,5,6},{7,8,9},
  {1,4,7},{2,5,8},{3,6,9},
  {1,5,9},{3,5,7},
}

local function new_match_state()
    return {
        presences = {},       -- session_id -> presence
        player_order = {},    -- { user_id1, user_id2 }
        marks = {},           -- user_id -> "X" or "O"
        names = {},           -- user_id -> username
        board = { "", "", "", "", "", "", "", "", "" },
        next_turn = nil,      -- user_id whose turn it is
        winner = nil,         -- user_id | nil
        is_draw = false,
        is_finished = false,
        end_reason = "",      -- "WIN", "DRAW", "OPPONENT_LEFT", etc.
        mode = "classic",
        turn_duration = 30,   -- seconds per move
        turn_expires_at = nil,-- unix seconds when current turn expires
        rematch_votes = {},   -- user_id -> true
    }
end

local function encode_match_state(state)
    local players = {}
    for _, user_id in ipairs(state.player_order) do
        table.insert(players, {
            userId   = user_id,
            username = state.names[user_id],
            mark     = state.marks[user_id],
        })
    end

    return nk.json_encode({
        board          = state.board,
        players        = players,
        nextTurnUserId = state.next_turn,
        winnerUserId   = state.winner,
        isDraw         = state.is_draw,
        isFinished     = state.is_finished,
        endReason      = state.end_reason or "", 
        turnExpiresAt  = state.turn_expires_at,
        mode           = state.mode or "classic",
    })
end

local function other_player(state, user_id)
  for _, uid in ipairs(state.player_order) do
    if uid ~= user_id then return uid end
  end
  return nil
end

local function set_next_turn(state, user_id)
    state.next_turn = user_id
    if user_id ~= nil and state.turn_duration and state.turn_duration > 0 then
        local now = nk.time()
        state.turn_expires_at = now + (state.turn_duration*1000)
    else
        state.turn_expires_at = nil
    end
end

local function check_winner(board)
    for _, line in ipairs(WIN_LINES) do
        local a, b, c = line[1], line[2], line[3]
        if board[a] ~= "" and board[a] == board[b] and board[b] == board[c] then
            return board[a] -- "X" or "O"
        end
    end

    local full = true
    for i = 1, 9 do
        if board[i] == "" then
            full = false
            break
        end
    end
    if full then 
        return "draw"
    end

    return nil
end

local function handle_move(state, dispatcher, message)
    if state.is_finished then
        return 
    end

    local sender = message.sender
    local user_id = sender.user_id

    if user_id ~= state.next_turn then
        local payload = nk.json_encode({ message = "Not your turn" })
        dispatcher.broadcast_message(OPCODE_ERROR, payload, { sender }, nil)
        return 
    end

    local ok, decoded = pcall(nk.json_decode, message.data)
    if not ok or type(decoded) ~= "table" or decoded.index == nil then
        local payload = nk.json_encode({ message = "Invalid move payload" })
        dispatcher.broadcast_message(OPCODE_ERROR, payload, { sender }, nil)
        return 
    end

    local index = tonumber(decoded.index)
    if not index or index < 0 or index > 8 then 
        local payload = nk.json_encode({ message = "Index out of range" })
        dispatcher.broadcast_message(OPCODE_ERROR, payload, { sender }, nil)
        return
    end

    local cell = index + 1
    if state.board[cell] ~= "" then
        local payload = nk.json_encode({ message = "Cell already taken" })
        dispatcher.broadcast_message(OPCODE_ERROR, payload, { sender }, nil)
        return 
    end

    local mark = state.marks[user_id]
    if not mark then
        -- should not hapen in a normal flow. just in case
        local payload = nk.json_encode({ message = "Player has no mark assigned" })
        dispatcher.broadcast_message(OPCODE_ERROR, payload, { sender }, nil)
        return 
    end

    state.board[cell] = mark

    local result = check_winner(state.board)
    if result == "draw" then
        state.is_draw = true
        state.is_finished = true
        state.winner = nil
        state.end_reason = "DRAW"
        state.turn_expires_at = nil
    elseif result == "X" or result == "O" then
        -- find the user with the mark
        for uid, m in pairs(state.marks) do
            if m == result then
                state.winner = uid
                break
            end
        end
        state.is_draw = false
        state.is_finished = true
        state.end_reason = "WIN"
        state.turn_expires_at = nil
    else 
        -- switch turn
        local next_uid = other_player(state, user_id)
        set_next_turn(state, next_uid)
    end

    local payload = encode_match_state(state)
    dispatcher.broadcast_message(OPCODE_STATE, payload, nil, nil)
end

local function reset_for_rematch(state)
    state.board = { "", "", "", "", "", "", "", "", "" }
    state.is_draw = false
    state.is_finished = false
    state.end_reason = ""
    state.winner = nil
    state.rematch_votes = {}

    local p1 = state.player_order[1]
    local p2 = state.player_order[2]

    local starter = nil
    if p1 and state.marks[p1] == "X" then
        starter = p2
    elseif p2 and state.marks[p2] == "X" then
        starter = p1
    else
        starter = p1 or p2
    end

    if starter then
        set_next_turn(state, starter)
    else
        set_next_turn(state, nil)
    end
end

local function handle_rematch_request(state, dispatcher, message)
    if not state.is_finished then 
        return 
    end

    local uid = message.sender.user_id
    if not uid then return end

    if not state.rematch_votes then
        state.rematch_votes = {}
    end

    state.rematch_votes[uid] = true

    -- count votes among active players
    local votes = 0
    local total = 0
    for _, user_id in ipairs(state.player_order) do
        total = total + 1
        if state.rematch_votes[user_id] then
            votes = votes + 1
        end
    end

    if total >= 2 and votes >= 2 then
        reset_for_rematch(state)
    end

    local payload = encode_match_state(state)
    dispatcher.broadcast_message(OPCODE_STATE, payload, nil, nil)
end

local M = {}

function M.match_init(context, params)
    local state = new_match_state()
    local mode = params.mode or "classic"
    state.mode = mode
    if mode == "timed" then
        state.turn_duration = 30
    else
        state.turn_duration = 0
        state.turn_expires_at = nil
    end
    local tick_rate = 1  -- 1 update per second is enough for Tic-Tac-Toe
    local label = "tictactoe:" .. mode
    return state, tick_rate, label
end

function M.match_join_attempt(context, dispatcher, tick, state, presence, metadata)
    local player_count = #state.player_order
    if state.is_finished or player_count >= 2 then
        return state, false, "Match is full"
    end
    return state, true
end

function M.match_join(context, dispatcher, tick, state, presences)
    for _, presence in ipairs(presences) do
        state.presences[presence.session_id] = presence
        local uid = presence.user_id

        -- first time this user joins
        local is_known = false
        for _, existing in ipairs(state.player_order) do
            if existing == uid then
                is_known = true
                break
            end
        end

        if not is_known and #state.player_order < 2 then 
            table.insert(state.player_order, uid)
            state.names[uid] = presence.username
        end
    end

    -- when we have 2 players, assign marks and starting player
    if #state.player_order == 2 and not state.marks[state.player_order[1]] then
        local p1 = state.player_order[1]
        local p2 = state.player_order[2]

        state.marks[p1] = "X"
        state.marks[p2] = "O"
        set_next_turn(state, p1)
    end

    local payload = encode_match_state(state)
    dispatcher.broadcast_message(OPCODE_STATE, payload, nil, nil)

    return state
end

function M.match_leave(context, dispatcher, tick, state, presences)
    for _, presence in ipairs(presences) do
        state.presences[presence.session_id] = nil
        local uid = presence.user_id
        --if a player leaves mid game other player wins
        if not state.is_finished then
            for _, pid in ipairs(state.player_order) do
                if pid == uid then
                    local other = other_player(state, uid)
                    state.winner = other
                    state.is_finished = true
                    state.is_draw = false
                    state.end_reason = "OPPONENT_LEFT"
                    break
                end
            end
        end
    end

    local payload = encode_match_state(state)
    dispatcher.broadcast_message(OPCODE_STATE, payload, nil, nil)
    -- if the game is finished and everyone left stop the match soon in match loop
    return state
end

function M.match_loop(context, dispatcher, tick, state, messages)
    for _, message in ipairs(messages) do
        if message.op_code == OPCODE_MOVE then
            handle_move(state, dispatcher, message)
        elseif message.op_code == OPCODE_REMATCH then
            handle_rematch_request(state, dispatcher, message)
        end
    end

    -- Timer check: if current player runs out of time, they lose.
    if not state.is_finished and state.turn_expires_at ~= nil then
        local now = nk.time()
        if now >= state.turn_expires_at and state.next_turn ~= nil then
            local loser = state.next_turn
            local winner = other_player(state, loser)

            if winner ~= nil then
                state.winner = winner  
                state.is_finished = true
                state.is_draw = false
                state.end_reason = "TIMEOUT"
                state.turn_expires_at = nil

                local payload = encode_match_state(state)
                dispatcher.broadcast_message(OPCODE_STATE, payload, nil, nil)
            end
        end
    end

    -- if finished and noone connected anymore
    local has_any_presence = false
    for _ in pairs(state.presences) do
        has_any_presence = true
        break
    end

    if state.is_finished and not has_any_presence then
        return nil
    end

    return state
end

function M.match_terminate(context, dispatcher, tick, state, grace_seconds)
    return state
end

function M.match_signal(context, dispatcher, tick, state, data)
    return state
end


-- =================RPC=====================

local function rpc_create_tiktaktoe_match(context, payload)

    -- Try to create an authoritative match from this module.
    local ok, result = pcall(nk.match_create, MODULE_NAME, {})

    if not ok then
        -- 'result' now contains the error string.
        nk.logger_error("Failed to create tiktaktoe match: " .. tostring(result))
        -- Returning a non-JSON string or error will cause a 500.
        -- So we encode a proper JSON error instead:
        return nk.json_encode({ error = "Failed to create match: " .. tostring(result) })
    end

    local match_id = result

    return nk.json_encode({ matchId = match_id })
end

local function tiktaktoe_matchmaker_matched(context, matched_users)
    local mode = "classic"
    if #matched_users > 0 then
        local candidate = matched_users[1]
        local sp = candidate.properties
        if sp.mode == "timed" or sp.mode == "classic" then
            mode = sp.mode
        end
    end
    nk.logger_info(string.format(
        "Matchmaker matched %d users, creating %s match with mode=%s.",
        #matched_users, MODULE_NAME, mode
    ))
    -- create an authoritative match using this module
    local match_id = nk.match_create(MODULE_NAME, { mode = mode })
    return match_id
end

nk.register_rpc(rpc_create_tiktaktoe_match, "create_tiktaktoe_match")
nk.register_matchmaker_matched(tiktaktoe_matchmaker_matched)

return M
    
