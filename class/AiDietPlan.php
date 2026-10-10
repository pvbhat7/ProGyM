<?php
/**
 * AI Diet Plans — admin generates a one-day meal plan for a member, reviews/edits it, saves it.
 *
 * Accuracy: calorie and macro TARGETS are computed here (Mifflin-St Jeor + activity + goal),
 * not by the model. The model only chooses foods/portions to hit those targets; the UI then
 * shows the plan's own meal totals against the targets so the admin can spot a bad plan.
 *
 * Privacy: the model gets age, gender, height, weight and the admin's form choices —
 * never the member's name, mobile or email.
 */
include_once __DIR__ . '/AiAssistant.php';

class AiDietPlan {

    const GOALS     = array('fat_loss' => 'Fat loss', 'muscle_gain' => 'Muscle gain', 'maintain' => 'Maintain weight', 'recomp' => 'Lose fat & build muscle');
    const DIETS     = array('veg' => 'Vegetarian (no egg, meat or fish)', 'eggetarian' => 'Vegetarian + eggs', 'nonveg' => 'Non-vegetarian', 'vegan' => 'Vegan (no dairy, egg, meat)');
    const ACTIVITY  = array('sedentary' => 1.2, 'light' => 1.375, 'moderate' => 1.55, 'active' => 1.725);
    const BUDGETS   = array('low' => 'Low budget — everyday home food', 'medium' => 'Medium budget', 'high' => 'No budget limit');

    // ── Member basics (pre-fill for the form) ───────────────────────────

    /** @return array|null [id, name, gender, age, height_cm, weight_kg, last_inputs] */
    public static function member(PDO $db, $clientId) {
        $s = $db->prepare("SELECT id, name, gender, birthDate, height, weight FROM client WHERE id = ?");
        $s->execute(array($clientId));
        $c = $s->fetch(PDO::FETCH_ASSOC);
        if (!$c) return null;

        // Latest weight-tracker entry beats the profile weight
        $w = $db->prepare("SELECT weight FROM WeightTracker WHERE cid = ? ORDER BY id DESC LIMIT 1");
        $w->execute(array($clientId));
        $tracked = $w->fetchColumn();

        $last = $db->prepare("SELECT inputs FROM ai_diet_plan WHERE client_id = ? ORDER BY id DESC LIMIT 1");
        $last->execute(array($clientId));
        $lastInputs = json_decode((string)$last->fetchColumn(), true);

        $g = strtolower(trim((string)$c['gender']));
        return array(
            'id'          => (int)$c['id'],
            'name'        => $c['name'],
            'gender'      => in_array($g, array('male', 'female')) ? $g : '',
            'age'         => self::age($c['birthDate']),
            'height_cm'   => floatval($c['height']) > 0 ? floatval($c['height']) : null,
            'weight_kg'   => floatval($tracked) > 0 ? floatval($tracked) : (floatval($c['weight']) > 0 ? floatval($c['weight']) : null),
            'last_inputs' => is_array($lastInputs) ? $lastInputs : null,
        );
    }

    private static function age($dmy) {
        if (!preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', trim((string)$dmy), $m)) return null;
        if (!checkdate((int)$m[2], (int)$m[1], (int)$m[3])) return null;
        $age = (new DateTime(sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1])))->diff(new DateTime('today'))->y;
        return ($age >= 10 && $age <= 90) ? $age : null;
    }

    // ── Inputs + targets ────────────────────────────────────────────────

    /** Validate/normalise the admin form. Throws Exception with a user-facing message. */
    public static function cleanInputs(array $in) {
        $pick = function ($k, array $allowed, $default) use ($in) {
            $v = isset($in[$k]) ? (string)$in[$k] : '';
            return array_key_exists($v, $allowed) ? $v : $default;
        };
        $num = function ($k) use ($in) { return isset($in[$k]) && is_numeric($in[$k]) ? floatval($in[$k]) : 0; };
        $txt = function ($k, $max) use ($in) {
            return mb_substr(trim(preg_replace('/\s+/', ' ', (string)(isset($in[$k]) ? $in[$k] : ''))), 0, $max);
        };
        $time = function ($k, $default) use ($in) {
            $v = isset($in[$k]) ? (string)$in[$k] : '';
            return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v) ? $v : $default;
        };

        $out = array(
            'gender'      => in_array(isset($in['gender']) ? $in['gender'] : '', array('male', 'female')) ? $in['gender'] : '',
            'age'         => (int)$num('age'),
            'height_cm'   => round($num('height_cm'), 1),
            'weight_kg'   => round($num('weight_kg'), 1),
            'goal'        => $pick('goal', self::GOALS, 'fat_loss'),
            'diet_type'   => $pick('diet_type', self::DIETS, 'veg'),
            'activity'    => $pick('activity', self::ACTIVITY, 'moderate'),
            'budget'      => $pick('budget', self::BUDGETS, 'medium'),
            'meals'       => max(3, min(7, (int)$num('meals') ?: 5)),
            'wake_time'   => $time('wake_time', '06:00'),
            'workout_time'=> $time('workout_time', '07:00'),
            'sleep_time'  => $time('sleep_time', '22:30'),
            'supplements' => !empty($in['supplements']),
            'avoid'       => $txt('avoid', 200),
            'medical'     => $txt('medical', 200),
            'notes'       => $txt('notes', 300),
        );
        if (!$out['gender'])                                       throw new Exception('Please choose gender.');
        if ($out['age'] < 12 || $out['age'] > 85)                  throw new Exception('Please enter a valid age (12–85).');
        if ($out['height_cm'] < 120 || $out['height_cm'] > 220)    throw new Exception('Please enter height in cm (120–220).');
        if ($out['weight_kg'] < 30 || $out['weight_kg'] > 200)     throw new Exception('Please enter weight in kg (30–200).');
        return $out;
    }

    /** Daily targets from Mifflin-St Jeor BMR × activity, adjusted for goal. */
    public static function targets(array $i) {
        $bmr  = 10 * $i['weight_kg'] + 6.25 * $i['height_cm'] - 5 * $i['age'] + ($i['gender'] === 'male' ? 5 : -161);
        $tdee = $bmr * self::ACTIVITY[$i['activity']];
        $adj  = array('fat_loss' => 0.80, 'muscle_gain' => 1.12, 'maintain' => 1.0, 'recomp' => 0.90);
        $kcal = max($bmr * 1.05, $tdee * $adj[$i['goal']]);              // never far below BMR
        $kcal = (int)(round($kcal / 50) * 50);

        // Protein on body weight, but for heavy members use a BMI-25 reference weight
        $refW = min($i['weight_kg'], 25 * pow($i['height_cm'] / 100, 2));
        $perKg = array('fat_loss' => 2.0, 'muscle_gain' => 1.8, 'maintain' => 1.4, 'recomp' => 2.0);
        $pk = $perKg[$i['goal']];
        // Veg/vegan without whey: >1.6 g/kg isn't realistic from Indian home food
        if (in_array($i['diet_type'], array('veg', 'vegan')) && !$i['supplements']) $pk = min($pk, 1.6);
        $protein = (int)round(min(200, $refW * $pk) / 5) * 5;
        $fat   = (int)round($kcal * 0.25 / 9 / 5) * 5;
        $carbs = (int)max(50, round(($kcal - $protein * 4 - $fat * 9) / 4 / 5) * 5);
        $water = round($i['weight_kg'] * 0.035 + 0.5, 1);

        return array('kcal' => $kcal, 'protein_g' => $protein, 'carbs_g' => $carbs, 'fat_g' => $fat,
                     'water_l' => $water, 'bmr' => (int)round($bmr), 'tdee' => (int)round($tdee));
    }

    // ── Generate ────────────────────────────────────────────────────────

    /** @return array ['plan' => [...], 'usage' => ['in','out'], 'model'] */
    public static function generate(array $i) {
        $t = self::targets($i);
        $cfg = AiAssistant::config();

        $profile = array(
            'gender' => $i['gender'], 'age' => $i['age'], 'height_cm' => $i['height_cm'], 'weight_kg' => $i['weight_kg'],
            'goal' => self::GOALS[$i['goal']], 'diet' => self::DIETS[$i['diet_type']],
            'activity_level' => $i['activity'], 'budget' => self::BUDGETS[$i['budget']],
            'meals_per_day' => $i['meals'], 'wake_up' => $i['wake_time'], 'workout_time' => $i['workout_time'], 'sleep' => $i['sleep_time'],
            'whey_protein_allowed' => $i['supplements'],
            'avoid_or_allergies' => $i['avoid'] ?: 'none', 'medical_notes' => $i['medical'] ?: 'none',
            'trainer_instructions' => $i['notes'] ?: 'none',
            'daily_targets' => array('kcal' => $t['kcal'], 'protein_g' => $t['protein_g'], 'carbs_g' => $t['carbs_g'], 'fat_g' => $t['fat_g'], 'water_l' => $t['water_l']),
        );

        $system = "You are the sports nutritionist at Pro Gym, Kolhapur (Maharashtra, India). Write a practical ONE-DAY meal plan the member can repeat daily.\n"
            . "Rules:\n"
            . "- Hit daily_targets: total kcal within ±5% and protein within ±10%, by choosing portions.\n"
            . "- Per-meal kcal and protein_g must be HONEST estimates of the listed portions. Never inflate numbers to reach a target — change portions instead. Reference values: "
            . "100 g paneer ≈ 265 kcal / 18 g protein; 1 whole egg ≈ 70 kcal / 6 g; 1 egg white ≈ 17 kcal / 3.5 g; 100 g cooked chicken breast ≈ 165 kcal / 31 g; "
            . "1 katori cooked dal (150 ml) ≈ 120 kcal / 7 g; 1 katori sprouts usal ≈ 150 kcal / 9 g; 1 katori boiled chana ≈ 200 kcal / 10 g; 1 katori curd ≈ 100 kcal / 6 g; "
            . "1 glass milk (250 ml) ≈ 150 kcal / 8 g; 1 glass buttermilk ≈ 40 kcal / 2 g; 1 chapati ≈ 100 kcal / 3 g; 1 jowar bhakri ≈ 120 kcal / 3.5 g; 1 katori cooked rice ≈ 170 kcal / 3.5 g; "
            . "1 katori poha ≈ 180 kcal / 3 g; 30 g peanuts ≈ 170 kcal / 7.5 g; 1 scoop whey ≈ 120 kcal / 24 g; 1 medium banana ≈ 105 kcal / 1.3 g; 1 tsp oil ≈ 45 kcal.\n"
            . "- Use common, affordable Indian / Maharashtrian home foods (poha, upma, chapati, jowar/bajra bhakri, rice, dal, usal, sprouts, paneer, curd, buttermilk, peanuts, seasonal fruits, eggs/chicken/fish only if the diet allows). Match the budget.\n"
            . "- Portions in household measures with numbers: e.g. '2 chapati', '1 katori dal (150 ml)', '100 g paneer', '3 egg whites + 1 whole egg'.\n"
            . "- Follow the diet type strictly. Never include anything in avoid_or_allergies. Whey only if whey_protein_allowed is true.\n"
            . "- Exactly meals_per_day meals, timed between wake_up and sleep, with a light pre-workout meal before workout_time and a protein-rich meal within 1 hour after it.\n"
            . "- If medical_notes is not 'none', keep it general and add a tip to follow their doctor's advice. No medical claims.\n"
            . "- Follow trainer_instructions when they don't conflict with these rules.\n"
            . "- English. Short, simple wording a gym member understands.\n"
            . "Reply with JSON only, exactly this shape:\n"
            . '{"title":"short plan name","summary":"2 sentences on the approach","meals":[{"time":"HH:MM","name":"Breakfast","items":["portion + food", "..."],"kcal":0,"protein_g":0,"alt":"one swap option for this meal"}],"tips":["3 to 5 short practical tips (water, sleep, cheat meal, etc.)"]}';

        $res = AiAssistant::complete(array(
            array('role' => 'system', 'content' => $system),
            array('role' => 'user', 'content' => json_encode($profile, JSON_UNESCAPED_UNICODE)),
        ), array('response_format' => array('type' => 'json_object'), 'temperature' => 0.6));

        $text = isset($res['choices'][0]['message']['content']) ? (string)$res['choices'][0]['message']['content'] : '';
        $text = trim(preg_replace('/^```(?:json)?\s*|\s*```$/', '', trim($text)));
        $raw = json_decode($text, true);
        if (!is_array($raw) || empty($raw['meals'])) throw new Exception('The AI returned an incomplete plan — please press Generate again.');

        $plan = self::cleanPlan($raw);
        $plan['targets'] = $t;
        return array(
            'plan'  => $plan,
            'usage' => array('in' => intval(isset($res['usage']['prompt_tokens']) ? $res['usage']['prompt_tokens'] : 0),
                             'out' => intval(isset($res['usage']['completion_tokens']) ? $res['usage']['completion_tokens'] : 0)),
            'model' => isset($cfg['model']) ? $cfg['model'] : null,
        );
    }

    /** Normalise a plan (from the model or from the admin's edits) to the stored shape. */
    public static function cleanPlan(array $p) {
        $s = function ($v, $max) { return mb_substr(trim((string)$v), 0, $max); };
        $meals = array();
        foreach (array_slice(isset($p['meals']) && is_array($p['meals']) ? $p['meals'] : array(), 0, 8) as $m) {
            if (!is_array($m)) continue;
            $items = array();
            foreach (array_slice(isset($m['items']) && is_array($m['items']) ? $m['items'] : array(), 0, 10) as $it) {
                $it = $s($it, 140);
                if ($it !== '') $items[] = $it;
            }
            if (!$items) continue;
            $time = isset($m['time']) && preg_match('/^([01]?\d|2[0-3]):[0-5]\d$/', (string)$m['time']) ? str_pad($m['time'], 5, '0', STR_PAD_LEFT) : '';
            $meals[] = array(
                'time'      => $time,
                'name'      => $s(isset($m['name']) ? $m['name'] : 'Meal', 40) ?: 'Meal',
                'items'     => $items,
                'kcal'      => max(0, min(3000, (int)(isset($m['kcal']) ? $m['kcal'] : 0))),
                'protein_g' => max(0, min(200, (int)(isset($m['protein_g']) ? $m['protein_g'] : 0))),
                'alt'       => $s(isset($m['alt']) ? $m['alt'] : '', 200),
            );
        }
        if (!$meals) throw new Exception('The plan has no meals.');
        usort($meals, function ($a, $b) { return strcmp($a['time'] ?: '99', $b['time'] ?: '99'); });

        $tips = array();
        foreach (array_slice(isset($p['tips']) && is_array($p['tips']) ? $p['tips'] : array(), 0, 8) as $tip) {
            $tip = $s($tip, 200);
            if ($tip !== '') $tips[] = $tip;
        }
        $out = array(
            'title'   => $s(isset($p['title']) ? $p['title'] : '', 100) ?: 'Diet plan',
            'summary' => $s(isset($p['summary']) ? $p['summary'] : '', 500),
            'meals'   => $meals,
            'tips'    => $tips,
        );
        if (isset($p['targets']) && is_array($p['targets'])) {
            $t = array();
            foreach (array('kcal', 'protein_g', 'carbs_g', 'fat_g', 'bmr', 'tdee') as $k) if (isset($p['targets'][$k])) $t[$k] = (int)$p['targets'][$k];
            if (isset($p['targets']['water_l'])) $t['water_l'] = round(floatval($p['targets']['water_l']), 1);
            $out['targets'] = $t;
        }
        return $out;
    }

    // ── Storage ─────────────────────────────────────────────────────────

    /** Save as the member's active plan (previous active → archived). Returns new id. */
    public static function save(PDO $db, $clientId, array $plan, array $inputs, $adminMobile, $model) {
        $plan = self::cleanPlan($plan);
        $db->beginTransaction();
        try {
            $db->prepare("UPDATE ai_diet_plan SET status = 'archived', updated_at = NOW() WHERE client_id = ? AND status = 'active'")
               ->execute(array($clientId));
            $db->prepare("INSERT INTO ai_diet_plan (client_id, title, inputs, plan, status, created_by, model, created_at, updated_at)
                          VALUES (?, ?, ?, ?, 'active', ?, ?, NOW(), NOW())")
               ->execute(array($clientId, $plan['title'], json_encode($inputs, JSON_UNESCAPED_UNICODE),
                               json_encode($plan, JSON_UNESCAPED_UNICODE), $adminMobile, $model ? mb_substr($model, 0, 60) : null));
            $id = (int)$db->lastInsertId();
            $db->commit();
            return $id;
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function forMember(PDO $db, $clientId) {
        $s = $db->prepare("SELECT id, client_id, title, inputs, plan, status, created_at FROM ai_diet_plan
                           WHERE client_id = ? AND status IN ('active','archived') ORDER BY id DESC LIMIT 20");
        $s->execute(array($clientId));
        return array_map(array('AiDietPlan', 'row'), $s->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Latest active plans across members (for the page's overview list). */
    public static function recent(PDO $db) {
        $rows = $db->query("SELECT p.id, p.client_id, p.title, p.status, p.created_at, c.name
                            FROM ai_diet_plan p JOIN client c ON c.id = p.client_id
                            WHERE p.status = 'active' ORDER BY p.id DESC LIMIT 30")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['id'] = (int)$r['id']; $r['client_id'] = (int)$r['client_id']; }
        return $rows;
    }

    public static function remove(PDO $db, $id) {
        $s = $db->prepare("UPDATE ai_diet_plan SET status = 'deleted', updated_at = NOW() WHERE id = ?");
        $s->execute(array($id));
        return $s->rowCount() > 0;
    }

    private static function row(array $r) {
        return array(
            'id' => (int)$r['id'], 'client_id' => (int)$r['client_id'], 'title' => $r['title'], 'status' => $r['status'],
            'created_at' => $r['created_at'],
            'inputs' => json_decode((string)$r['inputs'], true),
            'plan'   => json_decode((string)$r['plan'], true),
        );
    }
}
