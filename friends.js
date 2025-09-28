// friends.js

// --------------------
// Send a friend request
// --------------------
export async function sendFriendRequest(receiverId, authManager, supabaseClient) {
    const user = authManager.getCurrentUser();
    if (!user) return console.error("❌ Not authenticated");

    try {
        const { data, error } = await supabaseClient
            .from("friends")
            .insert([{ requester_id: user.id, receiver_id: receiverId, status: "pending" }]);

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("❌ Error sending request:", err);
    }
}

// --------------------
// Accept or reject
// --------------------
export async function respondToRequest(requestId, accept = true, supabaseClient) {
    try {
        const { data, error } = await supabaseClient
            .from("friends")
            .update({ status: accept ? "accepted" : "rejected" })
            .eq("id", requestId);

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("❌ Error responding:", err);
    }
}

// --------------------
// Get current friends
// --------------------
export async function getFriends(authManager, supabaseClient) {
    const user = authManager.getCurrentUser();
    if (!user) return [];

    try {
        const { data, error } = await supabaseClient
            .from("friends")
            .select(`
                id,
                status,
                requester_id,
                receiver_id,
                requester:profiles!requester_id(username, profile_picture),
                receiver:profiles!receiver_id(username, profile_picture)
            `)
            .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .eq("status", "accepted");

        if (error) throw error;

        return data.map(f => {
            const isSelfRequester = f.requester_id === user.id;
            const friendProfile = isSelfRequester ? f.receiver : f.requester;
            return {
                id: f.id,
                username: friendProfile.username,
                pfp: friendProfile.profile_picture,
            };
        });
    } catch (err) {
        console.error("❌ Error fetching friends:", err);
        return [];
    }
}
export async function getFriendStatus(userId, peerId, supabaseClient) {
    try {
        const { data, error } = await supabaseClient
            .from("friends")
            .select("*")
            .or(`and(requester_id.eq.${userId},receiver_id.eq.${peerId}),and(requester_id.eq.${peerId},receiver_id.eq.${userId})`)
            .single();

        if (error && error.code !== "PGRST116") { // ignore "no rows" error
            throw error;
        }
        return data || null; // null if no relationship
    } catch (err) {
        console.error("❌ Error checking friend status:", err);
        return null;
    }
}