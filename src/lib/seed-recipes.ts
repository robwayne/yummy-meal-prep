import { parseIngredientLines } from "./ingredients";
import type { Recipe } from "./types";

export type SeedRecipe = Omit<Recipe, "id" | "favorite" | "source" | "createdAt" | "updatedAt">;

function recipe(
  r: Omit<SeedRecipe, "ingredients" | "steps"> & { ingredients: string; steps: string[] },
): SeedRecipe {
  return { ...r, ingredients: parseIngredientLines(r.ingredients) };
}

/** Starter recipe book, loaded the first time the database is created. */
export const SEED_RECIPES: SeedRecipe[] = [
  recipe({
    title: "Garlic Butter Chicken Thighs",
    description: "Crispy-skinned chicken thighs basted in garlic butter. Weeknight gold.",
    servings: 4, prepMinutes: 10, cookMinutes: 30, cuisine: "American",
    tags: ["dinner", "high-protein", "gluten-free"],
    ingredients: `4 chicken thighs
3 tbsp butter
4 cloves garlic
1 tsp dried thyme
salt
pepper
1 lemon (optional)`,
    steps: [
      "Pat the chicken dry and season well with salt, pepper and thyme.",
      "Sear skin-side down in a hot oven-safe pan for 6–8 minutes until golden.",
      "Flip, add butter and smashed garlic, and baste.",
      "Roast at 200°C / 400°F for 18–20 minutes until cooked through. Finish with lemon.",
    ],
  }),
  recipe({
    title: "Classic Spaghetti Bolognese",
    description: "Slow-simmered beef and tomato ragù over spaghetti.",
    servings: 4, prepMinutes: 15, cookMinutes: 45, cuisine: "Italian",
    tags: ["dinner", "pasta", "freezer-friendly"],
    ingredients: `1 lb ground beef
1 onion
2 cloves garlic
1 carrot
1 can crushed tomatoes
2 tbsp tomato paste
400 g spaghetti
olive oil
salt
pepper
parmesan (optional)`,
    steps: [
      "Finely chop onion, carrot and garlic; soften in olive oil for 8 minutes.",
      "Add beef and brown well, breaking it up.",
      "Stir in tomato paste, then tomatoes. Simmer 30+ minutes, seasoning to taste.",
      "Cook spaghetti, toss with the sauce and top with parmesan.",
    ],
  }),
  recipe({
    title: "Vegetable Fried Rice",
    description: "The best way to use up leftover rice and odds-and-ends veg.",
    servings: 2, prepMinutes: 10, cookMinutes: 10, cuisine: "Chinese",
    tags: ["dinner", "quick", "vegetarian", "use-it-up"],
    ingredients: `3 cups cooked rice
2 eggs
1 cup frozen peas
1 carrot
3 green onions
2 cloves garlic
3 tbsp soy sauce
1 tsp sesame oil (optional)
oil`,
    steps: [
      "Scramble the eggs in a hot wok with a little oil; set aside.",
      "Stir-fry diced carrot and garlic for 2 minutes, then add peas.",
      "Add the rice and fry until hot and slightly crispy.",
      "Add soy sauce, sesame oil, eggs and green onions. Toss and serve.",
    ],
  }),
  recipe({
    title: "Shakshuka",
    description: "Eggs poached in a spiced tomato and pepper sauce.",
    servings: 2, prepMinutes: 10, cookMinutes: 20, cuisine: "Middle Eastern",
    tags: ["breakfast", "vegetarian", "one-pan", "gluten-free"],
    ingredients: `1 onion
1 bell pepper
2 cloves garlic
1 can crushed tomatoes
4 eggs
1 tsp cumin
1 tsp paprika
olive oil
salt
feta (optional)
fresh parsley (optional)
bread (optional)`,
    steps: [
      "Soften sliced onion and pepper in olive oil, then add garlic and spices.",
      "Add tomatoes and simmer 10 minutes until thickened. Season.",
      "Make wells and crack in the eggs. Cover and cook until whites are set.",
      "Top with feta and parsley. Serve with bread.",
    ],
  }),
  recipe({
    title: "Chicken Stir-Fry",
    description: "Tender chicken and crisp vegetables in a glossy soy-ginger sauce.",
    servings: 3, prepMinutes: 15, cookMinutes: 10, cuisine: "Chinese",
    tags: ["dinner", "quick", "high-protein"],
    ingredients: `1 lb chicken breast
1 bell pepper
1 head broccoli
2 cloves garlic
1 tbsp ginger
3 tbsp soy sauce
1 tbsp honey
1 tsp cornstarch
oil
rice (optional)`,
    steps: [
      "Slice chicken thinly. Mix soy sauce, honey, cornstarch and 3 tbsp water.",
      "Stir-fry chicken in a very hot pan until browned; remove.",
      "Stir-fry vegetables, garlic and ginger for 3–4 minutes.",
      "Return chicken, add sauce and toss until glossy. Serve over rice.",
    ],
  }),
  recipe({
    title: "Black Bean Tacos",
    description: "Smoky, speedy vegetarian tacos.",
    servings: 3, prepMinutes: 10, cookMinutes: 10, cuisine: "Mexican",
    tags: ["dinner", "quick", "vegetarian"],
    ingredients: `1 can black beans
6 tortillas
1 onion
1 tsp cumin
1 tsp chili powder
1 avocado
1 lime
cheddar (optional)
salsa (optional)
coriander (optional)`,
    steps: [
      "Soften diced onion, add drained beans and spices; mash lightly with a splash of water.",
      "Warm the tortillas.",
      "Fill with beans, sliced avocado, cheese and salsa. Squeeze over lime.",
    ],
  }),
  recipe({
    title: "Creamy Tomato Soup",
    description: "Silky tomato soup — perfect with a grilled cheese.",
    servings: 4, prepMinutes: 10, cookMinutes: 25, cuisine: "American",
    tags: ["lunch", "soup", "vegetarian"],
    ingredients: `2 cans crushed tomatoes
1 onion
2 cloves garlic
2 cups vegetable broth
1/2 cup heavy cream
2 tbsp butter
1 tsp sugar
salt
pepper
fresh basil (optional)`,
    steps: [
      "Melt butter and soften onion and garlic.",
      "Add tomatoes, broth and sugar; simmer 15 minutes.",
      "Blend until smooth, stir in cream and season.",
    ],
  }),
  recipe({
    title: "Grilled Cheese Sandwich",
    description: "Golden, buttery, melty. A classic for a reason.",
    servings: 1, prepMinutes: 2, cookMinutes: 6, cuisine: "American",
    tags: ["lunch", "quick", "vegetarian"],
    ingredients: `2 slices bread
2 slices cheddar
1 tbsp butter`,
    steps: [
      "Butter the outsides of the bread and sandwich the cheese between.",
      "Cook in a pan over medium-low heat, 3 minutes per side, until golden and melted.",
    ],
  }),
  recipe({
    title: "Pancakes",
    description: "Fluffy weekend pancakes from pantry basics.",
    servings: 4, prepMinutes: 5, cookMinutes: 15, cuisine: "American",
    tags: ["breakfast", "vegetarian", "sweet"],
    ingredients: `1 1/2 cups flour
1 tbsp sugar
2 tsp baking powder
1 1/4 cups milk
1 egg
3 tbsp butter
salt
maple syrup (optional)`,
    steps: [
      "Whisk dry ingredients. Whisk milk, egg and melted butter separately.",
      "Combine gently — a few lumps are fine.",
      "Cook ladlefuls on a buttered pan until bubbles form, flip, cook 1 more minute.",
    ],
  }),
  recipe({
    title: "Veggie Omelette",
    description: "A fast, protein-packed breakfast that clears out the crisper drawer.",
    servings: 1, prepMinutes: 5, cookMinutes: 5, cuisine: "French",
    tags: ["breakfast", "quick", "vegetarian", "gluten-free", "use-it-up"],
    ingredients: `3 eggs
1 tbsp butter
1/4 bell pepper (optional)
1 cup spinach (optional)
2 tbsp cheddar (optional)
2 mushrooms (optional)
salt
pepper`,
    steps: [
      "Sauté any veg in butter until soft; remove.",
      "Beat eggs with salt and pepper and pour into the pan. Stir gently, then let set.",
      "Add veg and cheese to one half, fold and slide onto a plate.",
    ],
  }),
  recipe({
    title: "Chickpea Curry",
    description: "Creamy coconut chickpea curry, ready in half an hour.",
    servings: 4, prepMinutes: 10, cookMinutes: 20, cuisine: "Indian",
    tags: ["dinner", "vegan", "gluten-free", "freezer-friendly"],
    ingredients: `2 cans chickpeas
1 can coconut milk
1 can crushed tomatoes
1 onion
3 cloves garlic
1 tbsp ginger
2 tbsp curry powder
2 cups spinach (optional)
oil
salt
rice (optional)`,
    steps: [
      "Soften onion in oil, then add garlic, ginger and curry powder for 1 minute.",
      "Add tomatoes, coconut milk and drained chickpeas. Simmer 15 minutes.",
      "Stir through spinach until wilted; season and serve with rice.",
    ],
  }),
  recipe({
    title: "Pasta Aglio e Olio",
    description: "Garlic, olive oil and chili — a midnight pantry pasta.",
    servings: 2, prepMinutes: 5, cookMinutes: 12, cuisine: "Italian",
    tags: ["dinner", "quick", "vegan", "pasta", "pantry"],
    ingredients: `200 g spaghetti
6 cloves garlic
1/3 cup olive oil
1/2 tsp red pepper flakes
fresh parsley (optional)
parmesan (optional)
salt`,
    steps: [
      "Cook spaghetti in well-salted water; reserve a cup of pasta water.",
      "Gently sizzle sliced garlic and chili flakes in olive oil until just golden.",
      "Toss in the pasta with a splash of pasta water until glossy. Add parsley.",
    ],
  }),
  recipe({
    title: "Beef Chili",
    description: "Hearty beef and bean chili — even better the next day.",
    servings: 6, prepMinutes: 15, cookMinutes: 60, cuisine: "Tex-Mex",
    tags: ["dinner", "freezer-friendly", "gluten-free", "high-protein"],
    ingredients: `1 lb ground beef
1 onion
1 bell pepper
3 cloves garlic
2 cans kidney beans
1 can crushed tomatoes
2 tbsp chili powder
1 tsp cumin
1 cup beef broth
salt
sour cream (optional)
cheddar (optional)`,
    steps: [
      "Brown beef; add onion, pepper and garlic and cook until soft.",
      "Stir in spices, then tomatoes, beans and broth.",
      "Simmer uncovered for 45 minutes. Season and serve with toppings.",
    ],
  }),
  recipe({
    title: "Caprese Salad",
    description: "Tomato, mozzarella and basil — summer on a plate.",
    servings: 2, prepMinutes: 10, cookMinutes: 0, cuisine: "Italian",
    tags: ["lunch", "no-cook", "vegetarian", "gluten-free", "quick"],
    ingredients: `3 tomatoes
8 oz mozzarella
fresh basil
2 tbsp olive oil
balsamic vinegar (optional)
salt
pepper`,
    steps: [
      "Slice tomatoes and mozzarella and arrange alternately.",
      "Tuck in basil leaves, drizzle with oil and balsamic, and season.",
    ],
  }),
  recipe({
    title: "Baked Salmon with Lemon & Dill",
    description: "Flaky oven-baked salmon with a bright lemon finish.",
    servings: 2, prepMinutes: 5, cookMinutes: 15, cuisine: "Scandinavian",
    tags: ["dinner", "quick", "high-protein", "gluten-free"],
    ingredients: `2 salmon fillets
1 lemon
1 tbsp olive oil
1 tsp dried dill
1 clove garlic
salt
pepper`,
    steps: [
      "Heat oven to 200°C / 400°F. Place salmon on a lined tray.",
      "Rub with oil, garlic, dill, salt and pepper; top with lemon slices.",
      "Bake 12–15 minutes until just flaky.",
    ],
  }),
  recipe({
    title: "Overnight Oats",
    description: "Make-ahead breakfast in a jar.",
    servings: 1, prepMinutes: 5, cookMinutes: 0, cuisine: "American",
    tags: ["breakfast", "no-cook", "vegetarian", "meal-prep"],
    ingredients: `1/2 cup rolled oats
1/2 cup milk
1/4 cup yogurt
1 tsp honey
berries (optional)
banana (optional)`,
    steps: [
      "Stir oats, milk, yogurt and honey together in a jar.",
      "Refrigerate overnight. Top with fruit in the morning.",
    ],
  }),
  recipe({
    title: "Potato Leek Soup",
    description: "Velvety, comforting and cheap.",
    servings: 4, prepMinutes: 15, cookMinutes: 30, cuisine: "French",
    tags: ["lunch", "soup", "vegetarian", "gluten-free"],
    ingredients: `3 leeks
4 potatoes
3 tbsp butter
4 cups vegetable broth
1/2 cup heavy cream (optional)
salt
pepper`,
    steps: [
      "Slice leeks and soften in butter for 10 minutes without browning.",
      "Add peeled, diced potatoes and broth; simmer 20 minutes.",
      "Blend, stir in cream and season.",
    ],
  }),
  recipe({
    title: "Banana Bread",
    description: "Turns spotty bananas into the best snack in the house.",
    servings: 8, prepMinutes: 15, cookMinutes: 60, cuisine: "American",
    tags: ["baking", "sweet", "vegetarian", "use-it-up"],
    ingredients: `3 bananas
1/3 cup butter
3/4 cup sugar
1 egg
1 tsp vanilla extract
1 tsp baking soda
1 1/2 cups flour
salt`,
    steps: [
      "Heat oven to 175°C / 350°F and grease a loaf tin.",
      "Mash bananas, stir in melted butter, sugar, egg and vanilla.",
      "Fold in baking soda, salt and flour. Bake 55–65 minutes.",
    ],
  }),
  recipe({
    title: "Greek Salad",
    description: "Crunchy, salty and fresh.",
    servings: 2, prepMinutes: 10, cookMinutes: 0, cuisine: "Greek",
    tags: ["lunch", "no-cook", "vegetarian", "gluten-free", "quick"],
    ingredients: `2 tomatoes
1 cucumber
1/2 red onion
1 bell pepper
100 g feta
1/4 cup olives
2 tbsp olive oil
1 tsp dried oregano
salt`,
    steps: [
      "Chop tomatoes, cucumber, pepper and onion into chunks.",
      "Top with feta and olives, drizzle with oil and sprinkle with oregano.",
    ],
  }),
  recipe({
    title: "Mac and Cheese",
    description: "Stovetop mac with a proper cheese sauce.",
    servings: 4, prepMinutes: 5, cookMinutes: 20, cuisine: "American",
    tags: ["dinner", "vegetarian", "comfort", "pasta"],
    ingredients: `300 g macaroni
3 tbsp butter
3 tbsp flour
2 cups milk
2 cups cheddar
1 tsp mustard (optional)
salt`,
    steps: [
      "Cook macaroni until just al dente.",
      "Melt butter, whisk in flour for 1 minute, then slowly whisk in milk until thick.",
      "Off the heat, stir in cheese and mustard. Fold through the pasta.",
    ],
  }),
  recipe({
    title: "Egg Fried Noodles",
    description: "Quick savoury noodles with egg and veg.",
    servings: 2, prepMinutes: 5, cookMinutes: 10, cuisine: "Chinese",
    tags: ["dinner", "quick", "vegetarian"],
    ingredients: `200 g egg noodles
2 eggs
2 green onions
1 cup cabbage (optional)
1 carrot (optional)
2 tbsp soy sauce
1 tbsp oyster sauce (optional)
oil`,
    steps: [
      "Cook noodles and drain.",
      "Scramble eggs in oil, then add shredded veg for 2 minutes.",
      "Add noodles and sauces, toss well, finish with green onions.",
    ],
  }),
  recipe({
    title: "Sheet-Pan Sausage & Veg",
    description: "Throw it on a tray, walk away, eat.",
    servings: 4, prepMinutes: 10, cookMinutes: 35, cuisine: "American",
    tags: ["dinner", "one-pan", "gluten-free", "use-it-up"],
    ingredients: `6 sausages
3 potatoes
1 bell pepper
1 red onion
1 zucchini (optional)
2 tbsp olive oil
1 tsp paprika
salt
pepper`,
    steps: [
      "Heat oven to 220°C / 425°F.",
      "Chop veg into chunks, toss with oil, paprika, salt and pepper, and spread on a tray with the sausages.",
      "Roast 30–35 minutes, turning halfway.",
    ],
  }),
];

/**
 * Second batch: balanced plates built around meat or seafood (protein + veg +
 * carb + fat + fibre). Added to existing recipe books by `migrateDatabase`.
 */
export const SEED_RECIPES_V2: SeedRecipe[] = [
  recipe({
    title: "Chicken Burrito Bowl",
    description: "Spiced chicken over rice with black beans, crisp lettuce, tomato and avocado.",
    servings: 4, prepMinutes: 15, cookMinutes: 20, cuisine: "Mexican",
    tags: ["dinner", "balanced", "high-protein", "meal-prep", "gluten-free"],
    ingredients: `1 lb chicken breast
1 1/2 cups rice
1 can black beans
1 cup corn
1 bell pepper
2 cups lettuce (raw)
2 tomatoes (raw)
1 avocado (raw)
1 lime
2 tbsp olive oil
2 tsp cumin
1 tsp chili powder
salt`,
    steps: [
      "Cook the rice.",
      "Toss chicken in cumin, chili powder, salt and oil; pan-fry 6–7 minutes a side, then slice.",
      "Sauté sliced pepper and corn for 4 minutes; warm the drained beans.",
      "Build bowls: rice, beans, veg, chicken, shredded lettuce, diced tomato and avocado. Squeeze over lime.",
    ],
  }),
  recipe({
    title: "Beef & Broccoli",
    description: "Takeout-style seared beef and broccoli in a glossy garlic-ginger sauce.",
    servings: 4, prepMinutes: 15, cookMinutes: 15, cuisine: "Chinese",
    tags: ["dinner", "balanced", "high-protein", "quick"],
    ingredients: `1 lb flank steak
1 head broccoli
1 carrot
1 1/2 cups rice
3 cloves garlic
1 tbsp ginger
1/4 cup soy sauce
1 tbsp honey
1 tbsp cornstarch
2 tbsp oil`,
    steps: [
      "Cook the rice. Slice steak thinly against the grain and toss with half the cornstarch.",
      "Sear beef in batches in a very hot pan; set aside.",
      "Stir-fry broccoli and sliced carrot with a splash of water for 3 minutes, then garlic and ginger.",
      "Add soy, honey, remaining cornstarch and 1/3 cup water; return beef and toss until glossy. Serve over rice.",
    ],
  }),
  recipe({
    title: "Garlic Shrimp with Quinoa & Greens",
    description: "Lemony garlic shrimp over fluffy quinoa with wilted spinach and fresh tomatoes.",
    servings: 3, prepMinutes: 10, cookMinutes: 20, cuisine: "Mediterranean",
    tags: ["dinner", "balanced", "high-protein", "quick", "gluten-free"],
    ingredients: `1 lb shrimp
1 cup quinoa
4 cups spinach
1 cup cherry tomatoes (raw)
4 cloves garlic
1 lemon
2 tbsp olive oil
1 tbsp butter
salt
pepper`,
    steps: [
      "Simmer quinoa in 2 cups salted water for 15 minutes; rest covered.",
      "Sizzle garlic in oil and butter, add shrimp and cook 2 minutes a side until pink.",
      "Stir in spinach until just wilted, then lemon juice and zest.",
      "Serve over quinoa, topped with halved raw tomatoes.",
    ],
  }),
  recipe({
    title: "Salmon Rice Bowl with Cucumber Salad",
    description: "Glazed salmon, rice, and a crunchy raw cucumber-carrot salad.",
    servings: 2, prepMinutes: 15, cookMinutes: 15, cuisine: "Japanese",
    tags: ["dinner", "balanced", "high-protein"],
    ingredients: `2 salmon fillets
1 cup rice
1 cucumber (raw)
1 carrot (raw)
1 avocado (raw)
3 tbsp soy sauce
1 tbsp honey
1 tbsp rice vinegar
1 tsp sesame oil
sesame seeds (optional)`,
    steps: [
      "Cook the rice.",
      "Brush salmon with 2 tbsp soy and the honey; bake at 200°C / 400°F for 12 minutes.",
      "Thinly slice cucumber and grate carrot; dress with rice vinegar, sesame oil and the rest of the soy.",
      "Serve salmon over rice with the salad and sliced avocado.",
    ],
  }),
  recipe({
    title: "Greek Chicken Pita Plate",
    description: "Oregano-lemon chicken with warm pita, yogurt sauce and a fresh chopped salad.",
    servings: 4, prepMinutes: 20, cookMinutes: 15, cuisine: "Greek",
    tags: ["dinner", "balanced", "high-protein", "salad"],
    ingredients: `1 1/2 lb chicken thighs
4 pita breads
1 cucumber
3 tomatoes
1/2 red onion
2 cups lettuce
1 cup yogurt
1 lemon
3 tbsp olive oil
2 tsp dried oregano
2 cloves garlic
salt`,
    steps: [
      "Marinate chicken in lemon juice, 2 tbsp oil, oregano, garlic and salt for 15+ minutes.",
      "Grill or pan-fry 5–6 minutes a side; rest and slice.",
      "Chop cucumber, tomatoes, onion and lettuce; dress with the remaining oil and salt.",
      "Mix yogurt with a squeeze of lemon. Serve with warm pita.",
    ],
  }),
  recipe({
    title: "Turkey & Sweet Potato Skillet",
    description: "One-pan ground turkey, sweet potato, peppers and spinach.",
    servings: 4, prepMinutes: 10, cookMinutes: 25, cuisine: "American",
    tags: ["dinner", "balanced", "high-protein", "one-pan", "gluten-free", "meal-prep"],
    ingredients: `1 lb ground turkey
2 sweet potatoes
1 bell pepper
1 onion
3 cups spinach
2 tbsp olive oil
1 tsp paprika
1 tsp cumin
salt
avocado (optional)`,
    steps: [
      "Cook diced sweet potato in oil, covered, for 10 minutes until nearly tender.",
      "Push aside, add turkey and onion and brown well.",
      "Add pepper and spices; cook 5 minutes. Fold in spinach until wilted. Season.",
    ],
  }),
  recipe({
    title: "Steak with Roasted Potatoes & Green Beans",
    description: "A proper steak dinner: seared steak, crispy potatoes and garlicky green beans.",
    servings: 2, prepMinutes: 10, cookMinutes: 35, cuisine: "American",
    tags: ["dinner", "balanced", "high-protein", "gluten-free"],
    ingredients: `2 steaks
1 lb potatoes
8 oz green beans
2 tbsp butter
2 tbsp olive oil
3 cloves garlic
salt
pepper`,
    steps: [
      "Roast halved potatoes in oil and salt at 220°C / 425°F for 30–35 minutes.",
      "Season steaks well; sear in a smoking-hot pan 3–4 minutes a side, basting with butter and garlic. Rest 5 minutes.",
      "Sauté green beans in the steak pan for 4–5 minutes.",
    ],
  }),
  recipe({
    title: "Chicken Fajitas",
    description: "Sizzling chicken, peppers and onions in warm tortillas.",
    servings: 4, prepMinutes: 15, cookMinutes: 15, cuisine: "Tex-Mex",
    tags: ["dinner", "balanced", "high-protein", "quick"],
    ingredients: `1 1/2 lb chicken breast
3 bell peppers
1 onion
8 tortillas
1 avocado (raw)
1 lime
2 tsp chili powder
1 tsp cumin
2 tbsp oil
2 cups lettuce (raw)
sour cream (optional)`,
    steps: [
      "Slice chicken, peppers and onion; toss chicken with spices, lime juice and 1 tbsp oil.",
      "Sear chicken in a hot pan until cooked; remove. Cook peppers and onion until charred at the edges.",
      "Return chicken, toss, and serve in warm tortillas with lettuce, avocado and sour cream.",
    ],
  }),
  recipe({
    title: "Pork & Cabbage Noodle Stir-Fry",
    description: "Quick pork and crunchy cabbage noodles with a savoury sauce.",
    servings: 3, prepMinutes: 10, cookMinutes: 12, cuisine: "Chinese",
    tags: ["dinner", "balanced", "quick"],
    ingredients: `12 oz pork tenderloin
200 g rice noodles
3 cups cabbage
1 carrot
2 green onions
3 cloves garlic
3 tbsp soy sauce
1 tbsp honey
2 tbsp oil
peanuts (optional)`,
    steps: [
      "Soak or cook noodles; drain.",
      "Stir-fry thin-sliced pork in oil until browned; remove.",
      "Stir-fry shredded cabbage, carrot and garlic for 3 minutes.",
      "Add noodles, pork, soy and honey; toss. Finish with green onions and peanuts.",
    ],
  }),
  recipe({
    title: "Tuna Niçoise Salad",
    description: "Tuna, potatoes, green beans and egg on crisp lettuce with a mustard dressing.",
    servings: 2, prepMinutes: 15, cookMinutes: 15, cuisine: "French",
    tags: ["lunch", "balanced", "high-protein", "salad", "gluten-free"],
    ingredients: `2 cans tuna
8 oz potatoes
4 oz green beans
2 eggs
4 cups lettuce
1 cup cherry tomatoes
1/4 cup olives
3 tbsp olive oil
1 tbsp vinegar
1 tsp mustard
salt`,
    steps: [
      "Boil potatoes 12 minutes, adding green beans for the last 3 and eggs (separately) for 8.",
      "Whisk oil, vinegar, mustard and salt.",
      "Arrange lettuce, halved potatoes, beans, tomatoes, olives, quartered eggs and flaked tuna. Dress.",
    ],
  }),
];

export const SEED_VERSION = 2;
