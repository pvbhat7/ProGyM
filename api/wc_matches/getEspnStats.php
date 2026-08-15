<?php
    // Returns the stored ESPN team-stats + goal-scorer timeline for a match.
    // Frontend (Match Result page) only calls this when status='settled'.
    //
    // Shape:
    //   { match_id, has_stats, has_goals,
    //     team_a_code, team_b_code,
    //     stats: { team_a: { Possession: "62%", ... }, team_b: { ... } } | null,
    //     goals: [ { minute, side: "A"|"B", scorer, type }, ... ] | null,
    //     fetched_at }
    //
    // A null stats/goals block just means ESPN didn't surface that data for
    // this match yet — the UI falls back to a friendly placeholder.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "Missing or invalid id."));
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->prepare(
        "SELECT m.id, m.status, m.stats_json, m.goals_json, m.stats_fetched_at,
                ta.short_code AS team_a_code, tb.short_code AS team_b_code,
                ta.name AS team_a_name,       tb.name AS team_b_name
           FROM wc_matches m
           JOIN wc_teams ta ON ta.id = m.team_a_id
           JOIN wc_teams tb ON tb.id = m.team_b_id
          WHERE m.id = :id"
    );
    $stmt->bindValue(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row){
        http_response_code(404);
        echo json_encode(array("message" => "Match not found."));
        exit;
    }

    $stats = $row['stats_json'] ? json_decode($row['stats_json'], true) : null;
    $goals = $row['goals_json'] ? json_decode($row['goals_json'], true) : null;

    echo json_encode(array(
        "match_id"     => (int)$row['id'],
        "status"       => $row['status'],
        "team_a_code"  => $row['team_a_code'],
        "team_a_name"  => $row['team_a_name'],
        "team_b_code"  => $row['team_b_code'],
        "team_b_name"  => $row['team_b_name'],
        "stats"        => is_array($stats) ? $stats : null,
        "goals"        => is_array($goals) ? $goals : null,
        "has_stats"    => is_array($stats) && !empty($stats),
        "has_goals"    => is_array($goals) && !empty($goals),
        "fetched_at"   => $row['stats_fetched_at'],
    ));
?>
