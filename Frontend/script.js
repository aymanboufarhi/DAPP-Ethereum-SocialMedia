// Configuration du contrat
const CONTRACT_ADDRESS = "";
const CONTRACT_ABI = []; // Ajoutez votre ABI ici

class MiniTwitter {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.accounts = [];
        this.currentAccount = null;

        this.initializeElements();
        this.initializeEventListeners();
    }

    // Initialisation des éléments DOM
    initializeElements() {
        this.connectWalletBtn = document.getElementById('connectWallet');
        this.accountInfo = document.getElementById('accountInfo');
        this.currentAccountSpan = document.getElementById('currentAccount');
        this.accountSelector = document.getElementById('accountSelector');
        this.postCreationSection = document.querySelector('.post-creation');
        this.postContent = document.getElementById('postContent');
        this.submitPostBtn = document.getElementById('submitPost');
        this.postsList = document.getElementById('postsList');
        this.postTemplate = document.getElementById('postTemplate');
    }

    // Initialisation des écouteurs d'événements
    initializeEventListeners() {
        this.connectWalletBtn.addEventListener('click', () => this.connectWallet());
        this.submitPostBtn.addEventListener('click', () => this.createPost());
        this.accountSelector.addEventListener('change', (e) => this.switchAccount(e.target.value));
    }

    // Connexion au wallet
    async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                alert('Veuillez installer MetaMask!');
                return;
            }

            // Demande de connexion à MetaMask
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.accounts = accounts;
            this.currentAccount = accounts[0];

            // Initialisation de Web3 et du contrat
            this.web3 = new Web3(window.ethereum);
            this.contract = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            // Mise à jour de l'interface
            this.updateUI();
            this.loadPosts();

            // Écoute des changements de compte
            window.ethereum.on('accountsChanged', (accounts) => this.handleAccountsChanged(accounts));
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            alert('Erreur lors de la connexion au wallet');
        }
    }

    // Mise à jour de l'interface après connexion
    updateUI() {
        this.connectWalletBtn.classList.add('hidden');
        this.accountInfo.classList.remove('hidden');
        this.postCreationSection.classList.remove('hidden');
        
        // Affichage de l'adresse courante
        this.currentAccountSpan.textContent = this.shortenAddress(this.currentAccount);
        
        // Mise à jour du sélecteur de comptes
        this.accountSelector.innerHTML = '';
        this.accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account;
            option.textContent = this.shortenAddress(account);
            option.selected = account === this.currentAccount;
            this.accountSelector.appendChild(option);
        });
        this.accountSelector.classList.remove('hidden');
    }

    // Création d'un nouveau post
    async createPost() {
        try {
            const content = this.postContent.value.trim();
            if (!content) return;

            await this.contract.methods.createPost(content)
                .send({ from: this.currentAccount });

            this.postContent.value = '';
            this.loadPosts();
        } catch (error) {
            console.error('Erreur lors de la création du post:', error);
            alert('Erreur lors de la création du post');
        }
    }

    // Chargement des posts
    async loadPosts() {
        try {
            const posts = await this.contract.methods.getAllPosts().call();
            this.postsList.innerHTML = '';

            posts.ids.forEach((id, index) => {
                const post = {
                    id: id,
                    author: posts.authors[index],
                    content: posts.contents[index],
                    likes: posts.likeCounts[index],
                    dislikes: posts.dislikeCounts[index],
                    timestamp: posts.timestamps[index],
                    lastModified: posts.lastModifieds[index]
                };

                this.renderPost(post);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des posts:', error);
        }
    }

    // Rendu d'un post
    renderPost(post) {
        const clone = this.postTemplate.content.cloneNode(true);
        const postElement = clone.querySelector('.post');
        
        postElement.dataset.postId = post.id;
        postElement.querySelector('.author').textContent = this.shortenAddress(post.author);
        postElement.querySelector('.content-text').textContent = post.content;
        postElement.querySelector('.timestamp').textContent = this.formatDate(post.timestamp);
        postElement.querySelector('.like-count').textContent = post.likes;
        postElement.querySelector('.dislike-count').textContent = post.dislikes;

        if (post.lastModified > 0) {
            const modifiedElement = postElement.querySelector('.post-modified');
            modifiedElement.classList.remove('hidden');
            modifiedElement.querySelector('.modified-date').textContent = this.formatDate(post.lastModified);
        }

        // Ajout des écouteurs d'événements
        postElement.querySelector('.btn-like').addEventListener('click', () => this.likePost(post.id));
        postElement.querySelector('.btn-dislike').addEventListener('click', () => this.dislikePost(post.id));

        if (post.author.toLowerCase() === this.currentAccount.toLowerCase()) {
            const editBtn = postElement.querySelector('.btn-edit');
            editBtn.classList.remove('hidden');
            editBtn.addEventListener('click', () => this.showEditForm(postElement, post.content));
        }

        this.postsList.insertBefore(clone, this.postsList.firstChild);
    }

    // Like d'un post
    async likePost(postId) {
        try {
            await this.contract.methods.likePost(postId)
                .send({ from: this.currentAccount });
            this.loadPosts();
        } catch (error) {
            console.error('Erreur lors du like:', error);
        }
    }

    // Dislike d'un post
    async dislikePost(postId) {
        try {
            await this.contract.methods.dislikePost(postId)
                .send({ from: this.currentAccount });
            this.loadPosts();
        } catch (error) {
            console.error('Erreur lors du dislike:', error);
        }
    }

    // Affichage du formulaire d'édition
    showEditForm(postElement, content) {
        const contentText = postElement.querySelector('.content-text');
        const editForm = postElement.querySelector('.edit-form');
        const editContent = postElement.querySelector('.edit-content');

        contentText.classList.add('hidden');
        editForm.classList.remove('hidden');
        editContent.value = content;

        const saveBtn = postElement.querySelector('.btn-save');
        const cancelBtn = postElement.querySelector('.btn-cancel');

        saveBtn.onclick = () => this.saveEdit(postElement);
        cancelBtn.onclick = () => this.cancelEdit(postElement, content);
    }

    // Sauvegarde de l'édition d'un post
    async saveEdit(postElement) {
        try {
            const postId = postElement.dataset.postId;
            const editContent = postElement.querySelector('.edit-content');
            const newContent = editContent.value.trim();
            
            if (!newContent) return;

            await this.contract.methods.editPost(postId, newContent)
                .send({ from: this.currentAccount });

            const contentText = postElement.querySelector('.content-text');
            const editForm = postElement.querySelector('.edit-form');
            
            contentText.textContent = newContent;
            contentText.classList.remove('hidden');
            editForm.classList.add('hidden');

            this.loadPosts(); // Recharger pour mettre à jour la date de modification
        } catch (error) {
            console.error('Erreur lors de la modification du post:', error);
            alert('Erreur lors de la modification du post');
        }
    }

    // Annulation de l'édition d'un post
    cancelEdit(postElement, originalContent) {
        const contentText = postElement.querySelector('.content-text');
        const editForm = postElement.querySelector('.edit-form');
        const editContent = postElement.querySelector('.edit-content');

        contentText.textContent = originalContent;
        contentText.classList.remove('hidden');
        editForm.classList.add('hidden');
        editContent.value = originalContent;
    }

    // Gestion du changement de compte
    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            // L'utilisateur s'est déconnecté
            this.disconnectWallet();
        } else if (accounts[0] !== this.currentAccount) {
            this.accounts = accounts;
            this.currentAccount = accounts[0];
            this.updateUI();
            this.loadPosts();
        }
    }

    // Déconnexion du wallet
    disconnectWallet() {
        this.web3 = null;
        this.contract = null;
        this.accounts = [];
        this.currentAccount = null;

        // Réinitialisation de l'interface
        this.connectWalletBtn.classList.remove('hidden');
        this.accountInfo.classList.add('hidden');
        this.postCreationSection.classList.add('hidden');
        this.accountSelector.classList.add('hidden');
        this.postsList.innerHTML = '';
    }

    // Changement de compte actif
    switchAccount(accountAddress) {
        if (this.currentAccount !== accountAddress) {
            this.currentAccount = accountAddress;
            this.currentAccountSpan.textContent = this.shortenAddress(accountAddress);
            this.loadPosts(); // Recharger les posts pour mettre à jour les boutons d'édition
        }
    }

    // Utilitaire : Raccourcissement d'une adresse Ethereum
    shortenAddress(address) {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // Utilitaire : Formatage de la date
    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    window.miniTwitter = new MiniTwitter();
});

// Export pour utilisation comme module si nécessaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiniTwitter;
}