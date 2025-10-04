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

export async function respondToRequest(requestId, accept = true, supabaseClient) {
    try {
        const { data, error } = await supabaseClient
            .from("friends")
            .update({ status: accept ? "accepted" : "rejected" })
            .eq("id", requestId)
            .select();

        if (error) throw error;

        if (accept && data && data.length > 0) {
            const friendship = data[0];

            await supabaseClient.rpc("increment_friendcounts", {
                req_id: friendship.requester_id,
                rec_id: friendship.receiver_id
            });
        }

        return data;
    } catch (err) {
        console.error("❌ Error responding:", err);
    }
}

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

        if (error && error.code !== "PGRST116") { 
            throw error;
        }
        return data || null;
    } catch (err) {
        console.error("❌ Error checking friend status:", err);
        return null;
    }
}

export async function deleteFriendship(requestId, supabaseClient) {
    try {
        const { data, error } = await supabaseClient
            .from("friends")
            .delete()
            .eq("id", requestId)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            console.warn("⚠️ No friendship found to delete with ID:", requestId);
            return null;
        }

        const friendshipData = data[0];

        await supabaseClient.rpc("decrement_friendcounts", {
            req_id: friendshipData.requester_id,
            rec_id: friendshipData.receiver_id
        });

        return data;
    } catch (err) {
        console.error("❌ Error deleting friendship:", err);
        return null;
    }
}

export async function getDetailedFriendStatus(userId, peerId, supabaseClient) {
    try {
        const friendship = await getFriendStatus(userId, peerId, supabaseClient);

        if (!friendship) {
            return { status: 'none', action: 'send', buttonText: 'Add Friend' };
        }

        if (friendship.status === 'accepted') {
            return { status: 'accepted', action: 'remove', buttonText: 'Remove Friend', requestId: friendship.id };
        }

        if (friendship.status === 'pending') {
            if (friendship.requester_id === userId) {
                return { status: 'sent', action: 'none', buttonText: 'Sent', requestId: friendship.id };
            } else {
                return { status: 'received', action: 'accept', buttonText: 'Accept', requestId: friendship.id };
            }
        }

        if (friendship.status === 'rejected') {
            return { status: 'rejected', action: 'none', buttonText: 'Declined', requestId: friendship.id };
        }

        return { status: 'unknown', action: 'none', buttonText: 'Add Friend' };
    } catch (err) {
        console.error("❌ Error getting detailed friend status:", err);
        return { status: 'error', action: 'send', buttonText: 'Add Friend' };
    }
}