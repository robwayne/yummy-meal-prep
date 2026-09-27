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
