/**
 * What each of the nine TVs decompiles: a made-up original binary, a few assembly lines (shown
 * first as hex bytes), the C-like pseudocode rebuilt from them, and a short follow-up. Plain
 * strings only; `script.ts` turns them into timed lines. Every line must fit 28 columns.
 */
export type Spec = {
  bin: string
  /** Comments after the prompt. */
  notes: readonly string[]
  /** The assembly each hex line rewrites into (offset is added by the builder). */
  asm: readonly string[]
  /** Pseudocode: `void` lines are function headers, lines starting with `;` are comments. */
  code: readonly string[]
  /** Follow-up lines that appear gently after the main decode. */
  tail: readonly string[]
}

export const SPECS: readonly Spec[] = [
  {
    bin: 'runner.bin',
    notes: ['; one level, no source.', '; find the jump code.'],
    asm: [
      'mov  eax, [vel_y]',
      'add  eax, 4',
      'mov  [pos_y], eax',
      'cmp  [on_floor], 0',
      'call hero_jump',
    ],
    code: [
      'void hero_jump(void) {',
      '  if (on_floor) {',
      '    vel_y = 4.2f;',
      '    on_floor = 0;',
      '  }',
      '}',
      'void block_bump(void) {',
      '  ; head hits a block',
      '  vel_y = -0.5f;',
      '}',
    ],
    tail: [
      '$ rea callers hero_jump',
      'hero_jump <- on_key_a',
      '; 1 caller, 2 writes',
      '$ rea rename fn_2 coin_rise',
    ],
  },
  {
    bin: 'block_world.bin',
    notes: ['; cube world, one chunk.', '; who places the blocks?'],
    asm: [
      'mov  ecx, [reach]',
      'cmp  ecx, 5',
      'jg   0x0090',
      'call place_block',
      'mov  [hotbar], 0',
    ],
    code: [
      'void place_block(int x) {',
      '  if (dist(x) > reach)',
      '    return;',
      '  world[x] = hotbar_id;',
      '  hotbar_count -= 1;',
      '}',
      'void break_block(int x) {',
      '  dig_time += 0.1f;',
      '  if (dig_time > 1.0f)',
      '    world[x] = AIR;',
      '}',
    ],
    tail: [
      '$ rea xrefs reach',
      'reach = 5.0  (2 reads)',
      '; the hand reaches 5 blocks',
      '$ rea rename fn_9 dig_tick',
    ],
  },
  {
    bin: 'pad_game.bin',
    notes: ['; two bars and a ball.', '; where does it turn back?'],
    asm: [
      'fld  dword [ball_dx]',
      'fchs',
      'fstp dword [ball_dx]',
      'call ball_bounce',
      'cmp  eax, [paddle_y]',
    ],
    code: [
      'void ball_bounce(void) {',
      '  if (hit(paddle_y))',
      '    ball_dx = -ball_dx;',
      '  ball_dy += spin * 0.5f;',
      '}',
      'void serve_ball(void) {',
      '  ball_dx = 3.0f;',
      '  ball_dy = 0.0f;',
      '}',
    ],
    tail: [
      '$ rea callers ball_bounce',
      'ball_bounce <- tick',
      '; speeds up on each hit',
      '$ rea rename fn_5 rally_end',
    ],
  },
  {
    bin: 'maze.bin',
    notes: ['; dots, walls, four chasers.', '; look for the turn logic.'],
    asm: [
      'mov  eax, [chase_dir]',
      'xor  eax, 2',
      'mov  [chase_dir], eax',
      'call chaser_turn',
      'dec  [dots_left]',
    ],
    code: [
      'void chaser_turn(void) {',
      '  if (at_corner)',
      '    chase_dir = pick_dir();',
      '  speed = 0.9f * base_speed;',
      '}',
      'void eat_dot(void) {',
      '  dots_left -= 1;',
      '  score += 10;',
      '}',
    ],
    tail: [
      '$ rea callers eat_dot',
      'eat_dot <- step',
      '; level ends at dots_left=0',
      '$ rea rename fn_3 win_check',
    ],
  },
  {
    bin: 'shooter.bin',
    notes: ['; a ship, bullets, waves.', '; find the fire rate.'],
    asm: [
      'mov  eax, [cooldown]',
      'sub  eax, 1',
      'jg   0x00b0',
      'call fire_bullet',
      'mov  [cooldown], 8',
    ],
    code: [
      'void fire_bullet(void) {',
      '  if (cooldown > 0)',
      '    return;',
      '  bullet_dy = -6.0f;',
      '  cooldown = 8;',
      '}',
      'void enemy_wave(void) {',
      '  wave_x += wave_dx;',
      '  if (wave_x > 20)',
      '    wave_dx = -wave_dx;',
      '}',
    ],
    tail: [
      '$ rea callers fire_bullet',
      'fire_bullet <- on_key_fire',
      '; 8 ticks between shots',
      '$ rea rename fn_6 wave_step',
    ],
  },
  {
    bin: 'racer.bin',
    notes: ['; one track, one car.', '; where is the steering?'],
    asm: [
      'fld  dword [steer]',
      'fmul dword [grip]',
      'fadd dword [heading]',
      'call steer_car',
      'inc  [lap]',
    ],
    code: [
      'void steer_car(void) {',
      '  heading += steer * grip;',
      '  speed -= drag * speed;',
      '}',
      'void lap_check(void) {',
      '  if (at_line && half_done)',
      '    lap += 1;',
      '}',
    ],
    tail: [
      '$ rea callers steer_car',
      'steer_car <- frame',
      '; grip = 0.82, drag = 0.03',
      '$ rea rename fn_4 boost_pad',
    ],
  },
  {
    bin: 'puzzle.bin',
    notes: ['; falling blocks, rows.', '; what clears a row?'],
    asm: [
      'mov  eax, [row_full]',
      'cmp  eax, 10',
      'jne  0x0066',
      'call clear_row',
      'add  [score], 100',
    ],
    code: [
      'void drop_piece(void) {',
      '  fall_delay -= 1;',
      '  if (fall_delay == 0)',
      '    piece_y += 1;',
      '}',
      'void clear_row(int r) {',
      '  shift_down(r);',
      '  score += 100;',
      '}',
    ],
    tail: [
      '$ rea callers clear_row',
      'clear_row <- lock_piece',
      '; a row is 10 cells wide',
      '$ rea rename fn_8 next_piece',
    ],
  },
  {
    bin: 'cards.bin',
    notes: ['; a deck and a table.', '; how is the deck mixed?'],
    asm: [
      'mov  eax, [seed]',
      'imul eax, 0x41C6',
      'add  eax, 12345',
      'call shuffle_deck',
      'mov  [hand_size], 5',
    ],
    code: [
      'void shuffle_deck(void) {',
      '  for (i = 51; i > 0; i--) {',
      '    j = rand() % (i + 1);',
      '    swap(deck[i], deck[j]);',
      '  }',
      '}',
      'void deal_hand(void) {',
      '  hand_size = 5;',
      '}',
    ],
    tail: [
      '$ rea callers shuffle_deck',
      'shuffle_deck <- new_round',
      '; rand: seed*0x41C6+12345',
      '$ rea rename fn_7 pick_card',
    ],
  },
  {
    bin: 'tank.bin',
    notes: ['; hills, a cannon, wind.', '; trace the shot path.'],
    asm: [
      'fld  dword [angle]',
      'fmul dword [power]',
      'fsub dword [wind]',
      'call fire_shell',
      'mov  [shell_t], 0',
    ],
    code: [
      'void aim_turret(void) {',
      '  angle += key_dir * 0.02f;',
      '  angle = clamp(a, 0, 90);',
      '}',
      'void fire_shell(void) {',
      '  shell_vx = power*cos(a);',
      '  shell_vy = power*sin(a);',
      '  shell_vx -= wind;',
      '}',
    ],
    tail: [
      '$ rea callers fire_shell',
      'fire_shell <- on_key_fire',
      '; wind pushes along x',
      '$ rea rename fn_1 hill_gen',
    ],
  },
]
