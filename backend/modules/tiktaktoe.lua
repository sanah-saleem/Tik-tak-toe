local nk = require("nakama")

-------------------------------------------
-- Constants and configurations
-------------------------------------------

-- opcodes (used by both client and server)
local OPCODE_MOVE = 1       -- client -> server
local OPCODE_STATE = 2      -- server -> clients (snapshot)
local OPCODE_ERROR = 3      -- server -> single client
local OPCODE_REMATCH = 4

local MODULE_NAME = "tiktaktoe"

local STATS_COLLECTION = "tiktaktoe"
local STATS_KEY = "stats"

local LEADERBOARD_ID = "tiktaktoe_wins"
local LEADERBOARD_INIT_DONE = false

local WIN_LINES = {
  {1,2,3},{4,5,6},{7,8,9},
  {1,4,7},{2,5,8},{3,6,9},
  {1,5,9},{3,5,7},
}

-------------------------------------
-- State construction and helpers
-------------------------------------

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
        stats_updated = false,
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

local function reset_for_rematch(state)
    state.board = { "", "", "", "", "", "", "", "", "" }
    state.is_draw = false
    state.is_finished = false
    state.end_reason = ""
    state.winner = nil
    state.rematch_votes = {}
    state.stats_updated = false

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

local function ensure_leaderboard()
    if LEADERBOARD_INIT_DONE then return end
    local ok, err = pcall(nk.leaderboard_create,
        LEADERBOARD_ID,
        true,          -- authoritative
        "desc",        -- higher score is better
        "set",         -- we always set current wins
        "",            -- no reset schedule
        {}             -- metadata
    )
    if not ok then
        nk.logger_error("Failed to create leaderboard: " .. tostring(err))
    end
    LEADERBOARD_INIT_DONE = true
end

local function update_player_stats(user_id, result)
    -- result: "win" | "loss" | "draw"
    if not user_id then return end

    ensure_leaderboard()

    local objects = nk.storage_read({
        { collection = STATS_COLLECTION, key = STATS_KEY, user_id = user_id}
    })

    local stats = { wins = 0, losses = 0, draws = 0 }

    if #objects > 0 then
        local stored = objects[1]
        local value = stored.value or {}
        stats.wins   = value.wins   or 0
        stats.losses = value.losses or 0
        stats.draws  = value.draws  or 0
    end

    if result == "win" then
        stats.wins = stats.wins + 1
    elseif result == "loss" then
        stats.losses = stats.losses + 1
    elseif result == "draw" then
        stats.draws = stats.draws + 1
    end

    nk.storage_write({
        {
            collection = STATS_COLLECTION,
            key = STATS_KEY,
            user_id = user_id,
            value = stats,
            permission_read = 1,  -- owner read (or 2 for public)
            permission_write = 0, -- only server writes
        }
    })

    -- update leaderboard
    local metadata = {
        losses = stats.losses,
        draws = stats.draws,
    }

    local ok, err = pcall(nk.leaderboard_record_write,
        LEADERBOARD_ID,
        user_id,
        nil,             -- no override owner_id
        stats.wins,      -- score
        0,               -- subscore
        metadata
    )

    if not ok then
        nk.logger_error("Failed to write leaderboard record for " .. user_id .. ": " .. tostring(err))
    end
end

local function update_stats_for_match(state)
    if state.stats_updated or not state.is_finished then
        return
    end

    local p1 = state.player_order[1]
    local p2 = state.player_order[2]
    if not p1 or not p2 then
        -- if someone left before 2 players, don't track
        state.stats_updated = true
        return
    end

    if state.is_draw then
        update_player_stats(p1, "draw")
        update_player_stats(p2, "draw")
    elseif state.winner then
        update_player_stats(state.winner, "win")
        local loser = other_player(state, state.winner)
        if loser then
            update_player_stats(loser, "loss")
        end
    end

    state.stats_updated = true
end

----------------------------------------------
-- Message handlers 
----------------------------------------------

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
        update_stats_for_match(state)
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
        update_stats_for_match(state)
    else 
        -- switch turn
        local next_uid = other_player(state, user_id)
        set_next_turn(state, next_uid)
    end

    local payload = encode_match_state(state)
    dispatcher.broadcast_message(OPCODE_STATE, payload, nil, nil)
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

----------------------------------------------
-- Match handler callbacks
----------------------------------------------

local M = {}

function M.match_init(context, params)
    ensure_leaderboard()
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
    local label = "tiktaktoe:" .. mode
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
                    state.turn_expires_at = nil
                    update_stats_for_match(state)
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
                update_stats_for_match(state)

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


-------------------------------------
-- RPC and match maker hooks
-------------------------------------

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
    -- create an authoritative match using this module
    local match_id = nk.match_create(MODULE_NAME, { mode = mode })
    return match_id
end

local function rpc_get_tiktaktoe_stats(context, payload)
    local user_id = context.user_id
    if not user_id then
        return nk.json_encode({ error = "Unauthenticated" })
    end

    local objects = nk.storage_read({
        { collection = STATS_COLLECTION, key = STATS_KEY, user_id = user_id }
    })

    local stats = { wins = 0, losses = 0, draws = 0 }

    if #objects > 0 then
        local value = objects[1].value or {}
        stats.wins   = value.wins   or 0
        stats.losses = value.losses or 0
        stats.draws  = value.draws  or 0
    end

    return nk.json_encode(stats)
end

local function rpc_get_tiktaktoe_leaderboard(context, payload)
    local user_id = context.user_id
    if not user_id then
        return nk.json_encode({ error = "Unauthenticated" })
    end

    ensure_leaderboard()

    local limit = 10
    if payload and #payload > 0 then
        local ok, decoded = pcall(nk.json_decode, payload)
        if ok and type(decoded) == "table" and decoded.limit then
            limit = tonumber(decoded.limit) or limit
        end
    end

    local records_result = nk.leaderboard_records_list(
        LEADERBOARD_ID,
        nil,
        limit,
        nil,
        0
    )

    local owner_result = nk.leaderboard_records_list(
        LEADERBOARD_ID,
        { user_id },
        1,
        nil,
        0
    )

    local top_records = (type(records_result) == "table" and records_result.records) or records_result or {}
    local owner_records = (type(owner_result) == "table" and owner_result.owner_records) or owner_result or {}
    
    nk.logger_info("owner record ==> : " .. nk.json_encode(owner_result))

    local user_ids, seen = {}, {}
    local function add_id(id)
        if id and id ~= "" and not seen[id] then
            seen[id] = true
            table.insert(user_ids, id)
        end
    end

    for _, rec in ipairs(top_records) do add_id(rec.owner_id) end
    for _, rec in ipairs(owner_records) do add_id(rec.owner_id) end

    -- Fetch users via accounts_get_id (Lua-safe)
    local users_by_id = {}
    if #user_ids > 0 then
        local ok, accounts = pcall(nk.accounts_get_id, user_ids)
        if ok and accounts then
            for _, acc in ipairs(accounts) do
                local u = acc and acc.user
                local uid = u and (u.user_id or u.id) -- support either key
                if uid then
                    users_by_id[uid] = u
                else
                    nk.logger_warn("account missing user_id: " .. nk.json_encode(acc))
                end
            end
        else
            nk.logger_error("accounts_get_id failed: " .. tostring(accounts))
        end
    end

    local function map_record(rec)
        local u = users_by_id[rec.owner_id] or {}
        local display_name = u.display_name or u.username or rec.owner_id
        local meta = rec.metadata or {}
        return {
            userId      = rec.owner_id,
            displayName = display_name,
            wins        = rec.score or 0,
            losses      = meta.losses or 0,
            draws       = meta.draws or 0,
            rank        = rec.rank or 0,
        }
    end

    local entries = {}
    for _, rec in ipairs(top_records) do
        table.insert(entries, map_record(rec))
    end

    local me = nil
    if #owner_records > 0 then
        me = map_record(owner_records[1])
    else
        for _, rec in ipairs(top_records) do
            if rec.owner_id == user_id then
                me = map_record(rec)
                break
            end
        end
    end

    return nk.json_encode({ entries = entries, me = me })
end



nk.register_rpc(rpc_create_tiktaktoe_match, "create_tiktaktoe_match")
nk.register_rpc(rpc_get_tiktaktoe_stats, "get_tiktaktoe_stats")
nk.register_rpc(rpc_get_tiktaktoe_leaderboard, "get_tiktaktoe_leaderboard")
nk.register_matchmaker_matched(tiktaktoe_matchmaker_matched)

return M
    
