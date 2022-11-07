// requires
const Sauce = require('../models/sauceSchema');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();

// Get all sauces
exports.getAllSauces = (req, res, next) => {
  Sauce.find()
    .then((sauces) => res.status(200).json(sauces))
    .catch((error) => res.status(400).json({ error: error }));
};

// Get one sauce
exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(404).json({ error: error }));
};

exports.createSauce = (req, res) => {
  // récupère les information de la sauce dans une variable
  const sauces = JSON.parse(req.body.sauce);
  if (!sauces) {
    return res
      .status(401)
      .json({ error: error, msgErr: 'Erreur récupération des données' });
  }
  // crée un nouvel element sauce avec l'url de l'image associer
  const sauce = new Sauce({
    ...sauces,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${
      req.file.filename
    }`,
  });
  if (!sauce) {
    return res
      .status(401)
      .json({ error: error, msgErr: 'Erreur création objet' });
  }

  // sauvegarde le nouvel element
  sauce
    .save()
    .then((createdSauce) =>
      res.status(201).json({ message: 'objet enregistré', data: createdSauce })
    )
    .catch((error) =>
      res.status(400).json({ error: error, msgErr: 'objet non enregistré' })
    );
};

// Modify sauce
exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file
    ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${
          req.file.filename
        }`,
      }
    : { ...req.body };
  Sauce.updateOne(
    { _id: req.params.id },
    { ...sauceObject, _id: req.params.id }
  )
    .then(() => res.status(200).json({ message: 'Sauce modifiée !' }))
    .catch((error) => res.status(400).json({ error }));
};

// Delete sauce
exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      const filename = sauce.imageUrl.split('/images/')[1];
      fs.unlink(`images/${filename}`, () => {
        Sauce.deleteOne({ _id: req.params.id })
          .then(() => res.status(200).json({ message: 'Sauce supprimée !' }))
          .catch((error) => res.status(400).json({ error: error }));
      });
    })
    .catch((error) => res.status(500).json({ error }));
};

// Like or dislike sauce (Post/:id/like)
exports.likeOrDislike = (req, res, next) => {
  // If user like sauce
  if (req.body.like === 1) {
    // Add 1 like and send to usersLiked
    Sauce.updateOne(
      { _id: req.params.id },
      {
        $inc: { likes: req.body.like++ },
        $push: { usersLiked: req.body.userId },
      }
    )
      .then((sauce) => res.status(200).json({ message: 'Like ajouté !' }))
      .catch((error) => res.status(400).json({ error }));
  } else if (req.body.like === -1) {
    // If user dont like
    // Add 1 dislike and send to usersDisliked
    Sauce.updateOne(
      { _id: req.params.id },
      {
        $inc: { dislikes: req.body.like++ * -1 },
        $push: { usersDisliked: req.body.userId },
      }
    )
      .then((sauce) => res.status(200).json({ message: 'Dislike ajouté !' }))
      .catch((error) => res.status(400).json({ error }));
  } else {
    // If like === 0 users delete his vote
    Sauce.findOne({ _id: req.params.id })
      .then((sauce) => {
        if (sauce) {
          // If table contain user ID
          if (sauce.usersLiked.includes(req.body.userId)) {
            // Delete like from table usersLiked
            Sauce.updateOne(
              { _id: req.params.id },
              { $pull: { usersLiked: req.body.userId }, $inc: { likes: -1 } }
            )
              .then((sauce) => {
                res.status(200).json({ message: 'Like supprimé !' });
              })
              .catch((error) => res.status(400).json({ error }));
          } else if (sauce.usersDisliked.includes(req.body.userId)) {
            // If table usersDisliked contain user ID
            // Delete dislike from usersDisliked
            Sauce.updateOne(
              { _id: req.params.id },
              {
                $pull: { usersDisliked: req.body.userId },
                $inc: { dislikes: -1 },
              }
            )
              .then((sauce) => {
                res.status(200).json({ message: 'Dislike supprimé !' });
              })
              .catch((error) => res.status(400).json({ error }));
          }
        } else {
          return res.status(404).json({ message: 'id non trouvé' });
        }
      })
      .catch((error) => res.status(400).json({ error }));
  }
};
