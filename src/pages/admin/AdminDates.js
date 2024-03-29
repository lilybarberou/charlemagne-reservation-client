import React, { useState, useEffect, useRef } from 'react';

import { toast } from 'react-toastify';
import moment from "moment";
import 'moment/locale/fr';

import InputText from '../../components/generic/InputText';
import TextArea from '../../components/generic/TextArea';
import InputButton from '../../components/generic/InputButton';
import DishList from '../../components/admin/DishList';
import AdminCalendar from "../../components/admin/AdminCalendar";
import Box from '../../components/generic/Box';

import { getDates, updateDate, createDate, deleteDate, delDishFromDate, addDishToDate } from '../../services/calendarService';
import { getDishes } from '../../services/dishesService';


const AdminDates = () => {

    const token = localStorage.getItem("adminToken");

    const ref = useRef(null);
    const box = useRef(null);

    const [date, setDate] = useState(new Date(new Date().toDateString()).getTime());
    const [dateList, setDatesList] = useState([]);
    const [dishList, setDishList] = useState([]);

    const [dateExists, setDateExists] = useState(false);
    const [visibility, setVisibility] = useState(true);
    const [comment, setComment] = useState("");
    const [nbP, setNbP] = useState("");
    const [price, setPrice] = useState("");
    const [currentDishList, setCurrentDishList] = useState([]);

    const [idD, setIdD] = useState("");
    const [idSearch, setIdSearch] = useState("");
    const [deleteDish, setDeleteDish] = useState(true);


    const [select, setSelect] = useState("");


    useEffect(() => {

        async function defineDate(dateC) {
            setDate(dateC);

            const dates = await getDates();
            setDatesList(dates);

            const foundDate = dates.filter((d) => d.dateC === dateC)[0];
            // la date existe dans la bdd
            if (foundDate) {
                setDateExists(true);
                setVisibility(foundDate.visibility);
                setComment(foundDate.comment);
                setNbP(parseInt(foundDate.nbPlaces));
                setPrice(foundDate.price);
                setSelect("");
                setCurrentDishList(foundDate.dishes);
            }
        }

        getDishList();
        defineDate(new Date(new Date().toDateString()).getTime());

    }, []);
    

    // SET STATES --------------------------------------------------------------

    const getDishList = async () => {
        const dishes = await getDishes();
        setDishList(dishes);
    }

    const getDateList = async () => {
        const dates = await getDates();
        setDatesList(dates);
    }

    const getDateDishes = async (dateC) => {
        const dates = await getDates();

        const foundDate = dates.filter((d) => d.dateC === dateC)[0];

        // la date existe dans la bdd
        if (foundDate) {
            setCurrentDishList(foundDate.dishes);
        }
    }

    const resetValues = () => {
        setDateExists(false);
        setVisibility(true);
        setComment("");
        setSelect("");
        setNbP("");
        setPrice("");
        setCurrentDishList([]);
    }   

    const resetValuesFromDate = (d) => {
        setDateExists(true);
        setVisibility(d.visibility);
        setComment(d.comment);
        setSelect("");
        setNbP(d.nbPlaces);
        setPrice(d.price);
        setCurrentDishList(d.dishes);
    }

    const onChangeDate = async (dateC) => {

        setDate(dateC);
        const foundDate = dateList.filter((d) => d.dateC === dateC)[0];

        // si la date n'existe pas encore dans la bdd
        if (!foundDate) resetValues();
        else resetValuesFromDate(foundDate);
    }

    // HANDLE ---------------------------------------------------------------
    
    const handleVisibilityChange = (e) => {
        if (e.target.id ==='y') setVisibility(true);
        else setVisibility(false);
    }

    const handleCommentChange = (e) => setComment(e.target.value);

    const handleSelectChange = (e) => {
        const val = e.target.value;
        setSelect(val);

        const dish = currentDishList.filter(d => d.name.toLowerCase() === val.toLowerCase());

        if (dish.length > 0) {
            setIdSearch(dish[0]._id);
        }
        else {
            let found = false;

            dishList.forEach((d) => {

                if (d.name.toLowerCase() === val.toLowerCase()) {
                    console.log(d);
                    setIdSearch(d._id);
                    found = true;
                }
            })

            if (!found) setIdSearch("");
        }
    }

    const handleNbChange = (e) => {
        const val = e.target.value;
        if(Number(val) || val === "") setNbP(val);
    }

    const handlePriceChange = (e) => {
        const val = e.target.value;
        if(Number(val) || val === "") setPrice(val);
    }
    

    // BD -------------------------------------------------------------------

    const saveDate = async () => {
        if (!dateExists) {
            if (nbP !== "" && price !== "") {
                createDate(date, visibility, comment, price, nbP, token);
                setDateExists(true);
                
                getDateList();
            }
            else toast.error("Veuillez entrer un nombre de places.")
        }
        else {
            const foundDate = dateList.filter((d) => d.dateC === date)[0];

            // nbReserve vaut le nombre de place actuel avant le changement de la date - le nbRemaining
            const nbReserve = foundDate.nbPlaces - foundDate.nbRemaining;

            if (parseInt(nbP) >= nbReserve) {
                await updateDate(date, visibility, comment, price, parseInt(nbP), parseInt(nbP)-nbReserve, token);
                getDateList();
            }
            else toast.error("Le nombre de places ne peut être inférieur à " +nbReserve);
        }        
        getDateList();
    }

    const deleteAndSetDate = async () => {

        const foundDate = dateList.filter((d) => d.dateC === date)[0];

        if (foundDate.nbPlaces === foundDate.nbRemaining) {
            await deleteDate(date, token);
            await getDateList();

            resetValues();
            getDateList();
            onChangeDate(new Date(new Date().toDateString()).getTime());
        }
        else toast.error("Il y a une réservation à cette date, vous ne pouvez pas la supprimer.");

        box.current.style.visibility = "hidden";
        box.current.style.opacity = 0;
    }

    const onDateSubmit = async (e) => {
        e.preventDefault();
        saveDate();
    }

    // btn ajouter la plat à la date
    const onDishSubmit = async (e) => {
        e.preventDefault();
        // si on a sélectionné qqe chose :
        if (select !== "" && idSearch !== "") {
            if (nbP !== "" && price !== "") {
                // si la date existe déjà
                if (dateExists) { 
                    const dish = dateList.filter((d) => d.dateC === date)[0].dishes.filter((d) => d._id === idSearch)[0];

                    // si le plat n'existe pas encore dans la date
                    if (!dish) {
                        // ajouter le plat à la date
                        await addDishToDate(date, idSearch, token);
                    }
                    else toast.error("Le plat existe déjà !");
                }

                // la date n'existe pas : on la crée et on ajoute le plat
                else {
                    await createDate(date, visibility, comment, price, nbP, token);
                    setDateExists(true);
                    await addDishToDate(date, idSearch, token);
                }
                getDateDishes(date);
                getDateList();
                setSelect("");
            }
            else toast.error("Veuillez entrer un nombre de places ou un prix.");
        }
        else toast.error("Aucun plat n'est sélectionné.");
    }

    const onClickDelete = async () => {
        
        await delDishFromDate(date, idD, token);
        getDateDishes(date);

        getDateList();

        box.current.style.visibility = "hidden";
        box.current.style.opacity = 0;
    }

    const onClickConfirmation = () => {
        box.current.style.visibility = "hidden";
        box.current.style.opacity = 0;
    }

    const onClickDeleteIcon = (e) => {
        setDeleteDish(true);
        setIdD(e._id);
        box.current.style.visibility = "visible";
        box.current.style.opacity = 1;
    }

    const onClickDeleteDate = () => {
        setDeleteDish(false);

        box.current.style.visibility = "visible";
        box.current.style.opacity = 1;
    }


    // RENDER ----------------------------------------------------------------

    return (
        <div className="admin-dates">
            <Box onClickConfirmation={onClickConfirmation} onClickDelete={deleteDish ?  onClickDelete: deleteAndSetDate} message={deleteDish ? "Voulez-vous vraiment supprimer cette date ?" : "Voulez-vous vraiment supprimer le plat de cette date ?"} boxRef={box}/>
            <div className="admin-dates__left">
                <div className="left__dates-list">
                    <AdminCalendar
                        rightRef={ref}
                        dateList={dateList}
                        onChangeDate={onChangeDate}
                    />
                </div>
            </div>
            
            <div className="admin-dates__right" ref={ref}>
                <h1 className="right__date">{moment(date).locale('fr').format('LL')}</h1>
                <div className="right__form">
                    <form className="right__form__1" onSubmit={onDateSubmit}>

                        <div className="right__form__radio" onChange={handleVisibilityChange}>
                            <span>Ouvert ?</span>
                            <input
                                type="radio"
                                value="Non"
                                name="visibility"
                                id="n"
                                checked={visibility === false}
                                readOnly
                            />
                            <label htmlFor="n">Non</label>
                            <input
                                type="radio" 
                                value="Oui"
                                name="visibility"
                                id="y"
                                checked={visibility === true}
                                readOnly
                            />
                            <label htmlFor="y">Oui</label>
                        </div>

                        <div className="right__places-price">
                            <div className="right__places">
                                <span>Places disponibles :</span>
                                <InputText
                                    value={nbP}
                                    placeholder="Places disponibles*"
                                    handleChange={handleNbChange}
                                    required={true}
                                />
                            </div>
                            
                            <div className="right__price">
                                <span>Prix du menu :</span>
                                <InputText
                                    value={price}
                                    placeholder="Prix du menu*"
                                    handleChange={handlePriceChange}
                                    required={true}
                                />
                            </div>
                            
                        </div>

                        <div className="select-container">
                            <input value={select} placeholder="Chercher un plat..." className="dish-select" type="text" list="list" onChange={handleSelectChange} />
                            <datalist id="list">
                                {
                                    dishList.map((d) => {
                                        return (
                                            <option key={d._id}>{d.name}</option>
                                        );
                                    })
                                }
                            </datalist>

                            <InputButton value= "Ajouter le plat à cette date" type="button" onClick={onDishSubmit}/>
                        </div>

                        <div className="dish-list">
                            <DishList
                                dishByDateList={currentDishList}
                                onClickDelete={onClickDeleteIcon}
                            />
                        </div>
                                    
                        <TextArea
                            value={comment}
                            placeholder="Commentaire pour cette date..."
                            required={false}
                            handleChange={handleCommentChange}
                        />

                        { dateExists ?
                            <div className="multi-btn">

                                    <div onClick={onClickDeleteDate}>
                                        <InputButton value="Supprimer" type="button"/>
                                    </div>

                                    <InputButton value="Enregistrer" type="submit"/>                                    
                            </div>
                        :
                            <div className="multi-btn">
                                <InputButton value="Créer" type="submit"/>
                            </div>
                        }


                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminDates;